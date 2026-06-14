"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Grid display order (left→right, top→bottom). IDs 1-9 map to AZ codes via IMAGE_ID_TO_AZ in lib/scoring.ts.
const lineImages = [
  { id: 1, src: "/lineas/A9Z.png", alt: "Líneas de fisuras"    },
  { id: 2, src: "/lineas/A8Z.png", alt: "Líneas en espiral"    },
  { id: 3, src: "/lineas/A1Z.png", alt: "Líneas convergentes"  },
  { id: 4, src: "/lineas/A6Z.png", alt: "Líneas agudas"        },
  { id: 5, src: "/lineas/A5Z.png", alt: "Líneas de red"        },
  { id: 6, src: "/lineas/A4Z.png", alt: "Líneas ondulantes"    },
  { id: 7, src: "/lineas/A3Z.png", alt: "Líneas enraizadas"    },
  { id: 8, src: "/lineas/A2Z.png", alt: "Líneas geométricas"   },
  { id: 9, src: "/lineas/A7Z.png", alt: "Líneas estáticas"     },
];

type DragSource =
  | { id: number; from: "grid" }
  | { id: number; from: "slot"; slotIndex: number };

export default function TestPage() {
  const router = useRouter();
  const [placed, setPlaced] = useState<Set<number>>(new Set());
  const [slots, setSlots] = useState<(number | null)[]>(Array(9).fill(null));
  const [dragging, setDragging] = useState<DragSource | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Reset timer on mount
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  function getImage(id: number) {
    return lineImages.find((img) => img.id === id)!;
  }

  function reset() {
    setPlaced(new Set());
    setSlots(Array(9).fill(null));
    setDragging(null);
    setDragOverSlot(null);
    startTimeRef.current = Date.now();
  }

  function onDragStart(source: DragSource) {
    setDragging(source);
  }

  function onDragEnd() {
    setDragging(null);
    setDragOverSlot(null);
  }

  function onDropSlot(slotIndex: number) {
    if (!dragging) return;
    const newSlots = [...slots];
    const newPlaced = new Set(placed);
    const displaced = newSlots[slotIndex];

    if (dragging.from === "grid") {
      newPlaced.add(dragging.id);
      if (displaced !== null) newPlaced.delete(displaced);
      newSlots[slotIndex] = dragging.id;
    } else {
      if (dragging.slotIndex === slotIndex) {
        setDragging(null);
        setDragOverSlot(null);
        return;
      }
      newSlots[dragging.slotIndex] = displaced;
      newSlots[slotIndex] = dragging.id;
    }

    setPlaced(newPlaced);
    setSlots(newSlots);
    setDragging(null);
    setDragOverSlot(null);
  }

  function onDropGrid() {
    if (!dragging || dragging.from !== "slot") return;
    const newSlots = [...slots];
    const newPlaced = new Set(placed);
    newPlaced.delete(dragging.id);
    newSlots[dragging.slotIndex] = null;
    setPlaced(newPlaced);
    setSlots(newSlots);
    setDragging(null);
  }

  async function handleHecho() {
    if (placed.size < 9) {
      setSubmitError("Debe ordenar las 9 líneas antes de continuar.");
      return;
    }

    const timeSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const rawUserData = sessionStorage.getItem("userData");
    const userData = rawUserData ? JSON.parse(rawUserData) : { nombre: "Anónimo", apellido: "", edad: "", sexo: "", estadoCivil: "", ocupacion: "", estudios: "", convivientes: "" };

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/test/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots, userData, timeSeconds }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Error al procesar los resultados");
      }

      const result = await res.json();
      sessionStorage.setItem("testResult", JSON.stringify(result));
      router.push("/results");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error inesperado. Intente nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* TopAppBar */}
      <nav className="fixed top-0 w-full z-50 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm dark:shadow-none">
        <div className="flex justify-between items-center px-8 py-4 max-w-full mx-auto">
          <div className="text-xl font-semibold text-sky-900 dark:text-sky-100 tracking-tight">
            Test de las Líneas
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <a
              className="text-slate-500 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-200 transition-colors duration-300 tracking-tight"
              href="/"
            >
              Instrucciones
            </a>
            <a
              className="text-slate-500 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-200 transition-colors duration-300 tracking-tight"
              href="#"
            >
              Sobre el Test
            </a>
          </div>
          <div className="md:hidden">
            <span className="material-symbols-outlined text-primary">menu</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="grow pt-24 pb-12 px-6 md:px-12 max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-12">
        {/* Sidebar */}
        <aside className="w-full md:w-1/4 flex flex-col gap-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-on-surface leading-tight">
              Evaluación Lineal
            </h1>
            <p className="text-on-surface-variant leading-relaxed">
              Observe cuidadosamente cada una de las estructuras. Arrastre los
              recuadros para ordenarlos de acuerdo a su preferencia estética o
              intuitiva en la zona inferior, del 1 al 9.
            </p>
          </div>

          <div className="p-6 bg-surface-container-low rounded-xl space-y-4 border border-outline-variant/10">
            <div className="flex items-center gap-3 text-primary">
              <span className="material-symbols-outlined">info</span>
              <span className="font-semibold text-sm uppercase tracking-wider">
                Estado de la Prueba
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Progreso</span>
                <span className="text-primary font-medium">
                  {placed.size}/9 colocadas
                </span>
              </div>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-linear-to-r from-primary to-primary-dim h-full transition-all duration-300"
                  style={{ width: `${(placed.size / 9) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-on-surface-variant/70 italic">
              Su selección es anónima y procesada bajo protocolos clínicos
              estrictos.
            </div>
          </div>
        </aside>

        {/* Test Canvas */}
        <section className="w-full md:w-3/4">
          <div className="test-grid-pattern p-8 md:p-12 rounded-xl bg-surface-container-lowest border border-outline-variant/5 shadow-[0_12px_32px_rgba(42,52,57,0.04)] relative">
            {/* 3×3 Grid */}
            <div
              className="grid grid-cols-3 gap-6 md:gap-8 mb-12"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDropGrid}
            >
              {lineImages.map((item) => {
                const isPlaced = placed.has(item.id);
                const isDraggingThis =
                  dragging?.id === item.id && dragging.from === "grid";

                return (
                  <div
                    key={item.id}
                    draggable={!isPlaced}
                    onDragStart={() =>
                      !isPlaced && onDragStart({ id: item.id, from: "grid" })
                    }
                    onDragEnd={onDragEnd}
                    className={[
                      "aspect-square rounded-xl border border-outline-variant/20 flex items-center justify-center relative transition-all duration-300",
                      isPlaced
                        ? "bg-surface-container-low opacity-30 cursor-default"
                        : isDraggingThis
                        ? "bg-primary-fixed-dim/10 opacity-50 scale-95 cursor-grabbing shadow-[0_4px_12px_rgba(42,52,57,0.08)]"
                        : "bg-surface-container-lowest shadow-[0_12px_32px_rgba(42,52,57,0.06)] cursor-grab hover:scale-[1.02] hover:bg-primary-fixed-dim/5 group",
                    ].join(" ")}
                  >
                    {!isPlaced && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        className="w-3/4 h-3/4 object-contain opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none"
                        src={item.src}
                        alt={item.alt}
                        draggable={false}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Drop Zone */}
            <div className="mt-8 pt-8 border-t border-outline-variant/20">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
                Secuencia Seleccionada
              </p>
              <div className="flex gap-2 md:gap-4 justify-between">
                {slots.map((slotId, i) => {
                  const img = slotId !== null ? getImage(slotId) : null;
                  const isOver = dragOverSlot === i;
                  const isDraggingFromHere =
                    dragging?.id === slotId &&
                    dragging?.from === "slot" &&
                    (dragging as { slotIndex: number }).slotIndex === i;

                  return (
                    <div
                      key={i}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverSlot(i);
                      }}
                      onDragLeave={() => setDragOverSlot(null)}
                      onDrop={() => onDropSlot(i)}
                      className={[
                        "flex-1 aspect-square rounded-lg border-2 border-dashed flex items-center justify-center relative transition-all duration-200",
                        isOver
                          ? "border-primary/60 bg-primary-fixed/20 scale-[1.05]"
                          : img
                          ? "border-outline-variant/20 bg-surface-container-lowest"
                          : "border-outline-variant/30 bg-surface-container-low",
                      ].join(" ")}
                    >
                      {img ? (
                        <div
                          draggable
                          onDragStart={() =>
                            onDragStart({ id: img.id, from: "slot", slotIndex: i })
                          }
                          onDragEnd={onDragEnd}
                          className={[
                            "w-full h-full flex items-center justify-center cursor-grab transition-opacity duration-200",
                            isDraggingFromHere ? "opacity-40" : "opacity-100",
                          ].join(" ")}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.src}
                            alt={img.alt}
                            className="w-4/5 h-4/5 object-contain pointer-events-none"
                            draggable={false}
                          />
                        </div>
                      ) : (
                        <span className="text-outline-variant/30 text-xl font-bold select-none">
                          {i + 1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error message */}
            {submitError && (
              <div className="mt-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                {submitError}
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-8 flex justify-end items-center gap-6">
              <button
                onClick={reset}
                disabled={submitting}
                className="text-on-surface-variant hover:text-on-surface transition-colors font-medium disabled:opacity-40"
              >
                Resetear Orden
              </button>
              <button
                onClick={handleHecho}
                disabled={submitting || placed.size < 9}
                className="bg-linear-to-br from-primary to-primary-dim text-on-primary px-10 py-4 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-px active:translate-y-px transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitting ? "Procesando…" : "Hecho"}
                {!submitting && (
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                )}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 mt-auto bg-slate-50 dark:bg-slate-950 border-t border-slate-200/20 dark:border-slate-800/20">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 max-w-7xl mx-auto">
          <div className="text-sm font-normal text-slate-500 dark:text-slate-400 mb-6 md:mb-0">
            © 2024 Test de las Líneas. Protocolo de Evaluación Psicológica.
          </div>
          <div className="flex gap-8">
            <a
              className="text-sm font-normal text-slate-500 dark:text-slate-400 hover:underline transition-all"
              href="#"
            >
              Privacidad
            </a>
            <a
              className="text-sm font-normal text-slate-500 dark:text-slate-400 hover:underline transition-all"
              href="#"
            >
              Términos
            </a>
            <a
              className="text-sm font-normal text-slate-500 dark:text-slate-400 hover:underline transition-all"
              href="#"
            >
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
