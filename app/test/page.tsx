"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClinicalHeader, PageFooter, StatusAlert, StepIndicator } from "@/app/components/clinical-ui";

const lineImages = [
  { id: 1, src: "/lineas/A9Z.png", alt: "Líneas de fisuras" },
  { id: 2, src: "/lineas/A8Z.png", alt: "Líneas en espiral" },
  { id: 3, src: "/lineas/A1Z.png", alt: "Líneas convergentes" },
  { id: 4, src: "/lineas/A6Z.png", alt: "Líneas agudas" },
  { id: 5, src: "/lineas/A5Z.png", alt: "Líneas de red" },
  { id: 6, src: "/lineas/A4Z.png", alt: "Líneas ondulantes" },
  { id: 7, src: "/lineas/A3Z.png", alt: "Líneas enraizadas" },
  { id: 8, src: "/lineas/A2Z.png", alt: "Líneas geométricas" },
  { id: 9, src: "/lineas/A7Z.png", alt: "Líneas estáticas" },
];

type DragState = { id: number; fromIndex: number | null };
type StoredOrder = { slots: (number | null)[]; startedAt: number; firstResponseTimes: Record<number, number> };

function padOrder(order: number[]) {
  return [...order, ...Array(Math.max(0, 9 - order.length)).fill(null)].slice(0, 9) as (number | null)[];
}

export default function TestPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<(number | null)[]>(Array(9).fill(null));
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const startTimeRef = useRef(Date.now());
  const firstResponseRef = useRef<Record<number, number>>({});
  const interactionStartRef = useRef<{ id: number; at: number } | null>(null);

  const order = useMemo(() => slots.filter((id): id is number => id !== null), [slots]);
  const placed = useMemo(() => new Set(order), [order]);
  const complete = order.length === 9;

  useEffect(() => {
    const currentToken = new URLSearchParams(window.location.search).get("token");
    setToken(currentToken);
    if (!currentToken || !sessionStorage.getItem("userData")) {
      router.replace(currentToken ? `/?token=${encodeURIComponent(currentToken)}` : "/");
      return;
    }
    const stored = sessionStorage.getItem("testOrder");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredOrder;
        if (Array.isArray(parsed.slots) && parsed.slots.length === 9) setSlots(parsed.slots);
        if (typeof parsed.startedAt === "number") startTimeRef.current = parsed.startedAt;
        if (parsed.firstResponseTimes) firstResponseRef.current = parsed.firstResponseTimes;
      } catch {
        sessionStorage.removeItem("testOrder");
      }
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    const stored: StoredOrder = { slots, startedAt: startTimeRef.current, firstResponseTimes: firstResponseRef.current };
    sessionStorage.setItem("testOrder", JSON.stringify(stored));
  }, [ready, slots]);

  function getImage(id: number) {
    return lineImages.find((image) => image.id === id)!;
  }

  function recordFirstResponse(id: number) {
    if (firstResponseRef.current[id] != null) return;
    const interaction = interactionStartRef.current;
    firstResponseRef.current[id] = interaction?.id === id ? Math.max(0, (Date.now() - interaction.at) / 1000) : 0;
  }

  function toggleStimulus(id: number) {
    setSubmitError(null);
    if (placed.has(id)) {
      setSlots(padOrder(order.filter((current) => current !== id)));
      return;
    }
    if (order.length < 9) {
      recordFirstResponse(id);
      setSlots(padOrder([...order, id]));
    }
  }

  function dropAt(index: number) {
    if (!dragging) return;
    const existingIndex = order.indexOf(dragging.id);
    const next = order.filter((id) => id !== dragging.id);
    const adjustedIndex = existingIndex !== -1 && existingIndex < index ? index - 1 : index;
    next.splice(Math.min(adjustedIndex, next.length), 0, dragging.id);
    if (dragging.fromIndex === null) recordFirstResponse(dragging.id);
    setSlots(padOrder(next));
    setDragging(null);
    setDragOverIndex(null);
    setSubmitError(null);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setSlots(padOrder(next));
  }

  function undoLast() {
    setSlots(padOrder(order.slice(0, -1)));
    setSubmitError(null);
  }

  function reset() {
    if (order.length > 0 && !window.confirm("¿Deseas borrar todo el orden y comenzar de nuevo?")) return;
    setSlots(Array(9).fill(null));
    setDragging(null);
    setDragOverIndex(null);
    setSubmitError(null);
    startTimeRef.current = Date.now();
    firstResponseRef.current = {};
  }

  async function handleSubmit() {
    if (!complete) {
      setSubmitError("Ordena los nueve estímulos antes de continuar.");
      return;
    }
    const rawUserData = sessionStorage.getItem("userData");
    if (!rawUserData) {
      router.replace(token ? `/?token=${encodeURIComponent(token)}` : "/");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const timeSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      const firstResponseTimes = lineImages.map((item) => firstResponseRef.current[item.id] ?? 0);
      const response = await fetch("/api/test/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          slots,
          userData: JSON.parse(rawUserData),
          timeSeconds,
          startedAt: new Date(startTimeRef.current).toISOString(),
          firstResponseTimes,
          consentAccepted: true,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "No se pudo procesar la evaluación.");
      }
      await response.json();
      sessionStorage.removeItem("testOrder");
      sessionStorage.removeItem("userData");
      router.push("/completed");
    } catch (error) {
      setConfirmOpen(false);
      setSubmitError(error instanceof Error ? error.message : "Ocurrió un error inesperado. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return <main className="flex min-h-screen items-center justify-center" aria-label="Preparando evaluación"><div className="h-8 w-8 animate-pulse rounded-full bg-primary-container" /></main>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <ClinicalHeader compact right={<span className="rounded-full bg-primary-container px-3 py-1.5 text-xs font-bold text-on-primary-container">Paso 3 de 3</span>} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-9">
        <div className="mx-auto mb-7 max-w-2xl"><StepIndicator current={3} /></div>

        <div className="grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-5">
            <div>
              <p className="eyebrow">Evaluación</p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Ordena los estímulos</h1>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">Toca cada imagen en orden, desde la que más te gusta hasta la que menos. No hay respuestas correctas o incorrectas.</p>
            </div>
            <div className="clinical-card p-4" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold">Progreso</span>
                <span className="font-extrabold text-primary">{order.length} de 9</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-valuenow={order.length} aria-valuemin={0} aria-valuemax={9} aria-label={`${order.length} de 9 estímulos ordenados`}>
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(order.length / 9) * 100}%` }} />
              </div>
              <p className="mt-3 text-xs leading-5 text-on-surface-variant">Tu avance se conserva si recargas esta página.</p>
            </div>
          </aside>

          <section className="space-y-5" aria-label="Área de ordenamiento">
            <div className="clinical-card p-4 sm:p-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div><p className="eyebrow">Estímulos disponibles</p><h2 className="mt-1 text-lg font-bold">Elige el siguiente</h2></div>
                <span className="hidden text-xs text-on-surface-variant sm:block">También puedes arrastrar en escritorio</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4" onDragOver={(event) => event.preventDefault()}>
                {lineImages.map((item) => {
                  const rank = order.indexOf(item.id);
                  const selected = rank !== -1;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      draggable={!selected}
                      onPointerDown={() => { interactionStartRef.current = { id: item.id, at: Date.now() }; }}
                      onClick={() => toggleStimulus(item.id)}
                      onDragStart={() => setDragging({ id: item.id, fromIndex: null })}
                      onDragEnd={() => { setDragging(null); setDragOverIndex(null); }}
                      aria-pressed={selected}
                      aria-label={selected ? `${item.alt}, posición ${rank + 1}. Quitar de la secuencia` : `${item.alt}. Agregar como posición ${order.length + 1}`}
                      className={`group relative aspect-square min-h-20 overflow-hidden rounded-lg border bg-white p-2 transition sm:p-3 ${selected ? "border-primary/35 opacity-45" : "border-outline-variant/50 hover:border-primary hover:shadow-sm"}`}
                    >
                      <Image src={item.src} alt="" width={728} height={728} sizes="(max-width: 640px) 30vw, 220px" className="h-full w-full object-contain" draggable={false} />
                      {selected && <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">{rank + 1}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="clinical-card p-4 sm:p-6">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div><p className="eyebrow">Tu secuencia</p><h2 className="mt-1 text-lg font-bold">De mayor a menor preferencia</h2></div>
                <button type="button" onClick={undoLast} disabled={order.length === 0 || submitting} className="button-quiet px-2">Deshacer</button>
              </div>
              <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant"><span className="rounded-full bg-primary-container px-2.5 py-1">1 = Más me gusta</span><span className="rounded-full bg-surface-container-low px-2.5 py-1">9 = Menos me gusta</span></div>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-9 sm:gap-2">
                {slots.map((slotId, index) => {
                  const image = slotId ? getImage(slotId) : null;
                  const active = index < order.length;
                  return (
                    <div
                      key={index}
                      onDragOver={(event) => { event.preventDefault(); setDragOverIndex(index); }}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={() => dropAt(index)}
                      className={`relative aspect-square min-h-20 rounded-lg border-2 ${dragOverIndex === index ? "border-primary bg-primary-container/70" : image ? "border-primary/25 bg-white" : "border-dashed border-outline-variant/45 bg-surface-container-low/60"}`}
                    >
                      <span className="absolute left-1.5 top-1.5 z-10 flex h-6 min-w-6 items-center justify-center rounded bg-on-surface px-1 text-[10px] font-extrabold text-white">{index + 1}</span>
                      {image ? (
                        <div draggable onDragStart={() => setDragging({ id: image.id, fromIndex: index })} onDragEnd={() => { setDragging(null); setDragOverIndex(null); }} className="flex h-full w-full cursor-grab items-center justify-center p-2">
                          <Image src={image.src} alt={image.alt} width={728} height={728} sizes="120px" className="h-full w-full object-contain" draggable={false} />
                          <div className="absolute bottom-1 right-1 flex gap-0.5 rounded bg-white/95 p-0.5 shadow-sm">
                            <button type="button" disabled={index === 0} onClick={(event) => { event.stopPropagation(); move(index, -1); }} className="flex h-7 w-7 items-center justify-center rounded text-sm font-bold text-primary hover:bg-primary-container disabled:opacity-25" aria-label={`Mover posición ${index + 1} hacia arriba`}>←</button>
                            <button type="button" disabled={index === order.length - 1} onClick={(event) => { event.stopPropagation(); move(index, 1); }} className="flex h-7 w-7 items-center justify-center rounded text-sm font-bold text-primary hover:bg-primary-container disabled:opacity-25" aria-label={`Mover posición ${index + 1} hacia abajo`}>→</button>
                          </div>
                        </div>
                      ) : <span className="flex h-full items-center justify-center text-xs font-bold text-outline-variant">{active ? "Soltar" : "Vacío"}</span>}
                    </div>
                  );
                })}
              </div>

              {submitError && <div className="mt-5"><StatusAlert>{submitError}</StatusAlert></div>}
              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-outline-variant/25 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={reset} disabled={submitting} className="button-quiet">Reiniciar orden</button>
                <button type="button" onClick={() => setConfirmOpen(true)} disabled={!complete || submitting} className="button-primary sm:min-w-48">Revisar y enviar</button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <PageFooter />

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/45 p-0 sm:items-center sm:p-6" role="presentation" onKeyDown={(event) => { if (event.key === "Escape" && !submitting) setConfirmOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-lg rounded-t-xl bg-white p-6 shadow-2xl sm:rounded-xl sm:p-8">
            <p className="eyebrow">Confirmación final</p>
            <h2 id="confirm-title" className="mt-2 text-2xl font-extrabold">¿Enviar esta secuencia?</h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">Después de enviarla no podrás modificar tus respuestas. Los resultados estarán disponibles únicamente para el profesional responsable.</p>
            <div className="mt-5 grid grid-cols-9 gap-1.5 rounded-lg bg-surface-container-low p-3" aria-label="Resumen de la secuencia">
              {order.map((id, index) => <div key={id} className="relative aspect-square rounded bg-white p-0.5"><Image src={getImage(id).src} alt={`Posición ${index + 1}`} width={80} height={80} className="h-full w-full object-contain" /><span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">{index + 1}</span></div>)}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" autoFocus onClick={() => setConfirmOpen(false)} disabled={submitting} className="button-secondary">Volver a revisar</button>
              <button type="button" onClick={handleSubmit} disabled={submitting} className="button-primary sm:min-w-36">{submitting ? "Enviando…" : "Enviar evaluación"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
