"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ClinicalHeader, StatusAlert } from "@/app/components/clinical-ui";
import { DoctorWorkspace } from "@/app/doctor/_components/doctor-tabs";
import { ScanTestModal } from "@/app/doctor/_components/scan-test-modal";
import { downloadExcelFile, type ExcelColumn } from "@/lib/excel-export";
import { DOCUMENT_TYPE_LABELS, DocumentType, maskDocument } from "@/lib/patients";

const RANKING_CODES = ["A1Z", "A2Z", "A3Z", "A4Z", "A5Z", "A6Z", "A7Z", "A8Z", "A9Z"] as const;

const PATIENT_COLUMNS: ExcelColumn[] = [
  { key: "fecha", label: "Fecha de evaluación", width: 27 },
  { key: "paciente", label: "Paciente", width: 30 },
  { key: "estilo", label: "Estilo de afrontamiento", width: 30, wrap: true },
  { key: "conocimiento", label: "Conocimiento", width: 38, wrap: true },
  { key: "planeamiento", label: "Planeamiento", width: 38, wrap: true },
  { key: "enfrentamiento", label: "Enfrentamiento", width: 38, wrap: true },
  { key: "trio_negativo", label: "Trío negativo", width: 28 },
  { key: "dominante", label: "Dominante", width: 28 },
  { key: "duracion_segundos", label: "Duración (s)", width: 18, kind: "decimal" },
  { key: "tiempo_promedio_respuesta", label: "Promedio de respuesta (s)", width: 26, kind: "decimal" },
  ...RANKING_CODES.map((code) => ({ key: code, label: code, width: 11, kind: "integer" as const })),
];

type StoredResult = {
  claveAfrontamiento?: string;
  copingStyle?: {
    style?: string;
    dimensions?: { conocimiento?: string; planeamiento?: string; enfrentamiento?: string };
  };
  negativeTrio?: { levelLabel?: string; dominantLabel?: string };
};

type Evaluation = {
  id: string;
  nombre: string;
  apellido: string;
  edad: string;
  sexo: string;
  estado_civil: string;
  ocupacion: string;
  estudios: string;
  convivientes: string;
  rankings: Record<string, number>;
  result: StoredResult;
  total_execution_seconds: number;
  average_response_seconds: number;
  first_response_times: number[];
  started_at: string;
  finished_at: string;
  created_at: string;
  source_type?: "online" | "imported";
  source_pdf_path?: string | null;
};

type PatientDetail = {
  id: string;
  nombre: string;
  apellido: string;
  document_type: DocumentType | null;
  document_number: string | null;
  created_at: string;
  updated_at: string;
  evaluations: Evaluation[];
};

type GeneratedLink = { url: string; expiresAt: string };
type ApiError = { error?: string; code?: string; patient_id?: string };

function formatDuration(seconds: number) {
  const safeSeconds = Number.isFinite(Number(seconds)) ? Math.max(0, Math.round(Number(seconds))) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return minutes ? `${minutes} min ${rest} s` : `${rest} s`;
}

function rankClass(rank: number | undefined) {
  if (typeof rank !== "number") return "bg-surface-container-low text-on-surface-variant";
  if (rank <= 3) return "bg-primary-container text-on-primary-container";
  if (rank <= 6) return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-900";
}

async function exportPatient(patient: PatientDetail) {
  const rows = patient.evaluations.map((evaluation) => ({
    fecha: evaluation.created_at,
    paciente: `${patient.nombre} ${patient.apellido}`,
    estilo: evaluation.result?.copingStyle?.style ?? "",
    conocimiento: evaluation.result?.copingStyle?.dimensions?.conocimiento ?? "",
    planeamiento: evaluation.result?.copingStyle?.dimensions?.planeamiento ?? "",
    enfrentamiento: evaluation.result?.copingStyle?.dimensions?.enfrentamiento ?? "",
    trio_negativo: evaluation.result?.negativeTrio?.levelLabel ?? "",
    dominante: evaluation.result?.negativeTrio?.dominantLabel ?? "",
    duracion_segundos: evaluation.total_execution_seconds,
    tiempo_promedio_respuesta: evaluation.average_response_seconds,
    ...Object.fromEntries(RANKING_CODES.map((code) => [code, evaluation.rankings?.[code] ?? ""])),
  }));
  await downloadExcelFile({
    columns: PATIENT_COLUMNS,
    rows,
    sheetName: "Evolución",
    fileName: `evolucion-${patient.nombre}-${patient.apellido}.xlsx`,
  });
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingLink, setCreatingLink] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [editApellido, setEditApellido] = useState("");
  const [editDocumentType, setEditDocumentType] = useState<DocumentType>("dni");
  const [editDocumentNumber, setEditDocumentNumber] = useState("");
  const [duplicatePatientId, setDuplicatePatientId] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const loadPatient = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/doctor/patients/${id}`);
      const data = await response.json().catch(() => null) as (PatientDetail & ApiError) | null;
      if (response.status === 401 || data?.code === "UNAUTHORIZED") {
        router.replace("/doctor?reason=session_expired");
        return;
      }
      if (!response.ok || !data?.id) throw new Error(data?.error || "No se pudo cargar la ficha.");
      setPatient(data);
      setEditNombre(data.nombre);
      setEditApellido(data.apellido);
      setEditDocumentType(data.document_type ?? "dni");
      setEditDocumentNumber(data.document_number ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la ficha.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { void loadPatient(); }, [loadPatient]);

  const evaluations = useMemo(
    () => [...(patient?.evaluations ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [patient],
  );
  const latest = evaluations[0];
  const previous = evaluations[1];

  async function saveIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setDuplicatePatientId(null);
    try {
      const response = await fetch(`/api/doctor/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editNombre,
          apellido: editApellido,
          document_type: editDocumentNumber.trim() ? editDocumentType : null,
          document_number: editDocumentNumber,
        }),
      });
      const data = await response.json().catch(() => null) as (PatientDetail & ApiError) | null;
      if (!response.ok || !data?.id) {
        if (response.status === 409 && data?.patient_id) setDuplicatePatientId(data.patient_id);
        throw new Error(data?.error || "No se pudo actualizar la ficha.");
      }
      setPatient((current) => current ? { ...current, ...data } : current);
      setEditDocumentNumber(data.document_number ?? "");
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo actualizar la ficha.");
    } finally {
      setSaving(false);
    }
  }

  async function createLink() {
    setCreatingLink(true);
    setCopyState("idle");
    setError(null);
    try {
      const response = await fetch(`/api/doctor/patients/${id}/links`, { method: "POST" });
      const data = await response.json().catch(() => null) as ({ token?: string; expires_at?: string } & ApiError) | null;
      if (!response.ok || !data?.token || !data.expires_at) throw new Error(data?.error || "No se pudo generar el enlace.");
      setGeneratedLink({ url: `${window.location.origin}/?token=${data.token}`, expiresAt: data.expires_at });
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "No se pudo generar el enlace.");
    } finally {
      setCreatingLink(false);
    }
  }

  async function copyLink() {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink.url);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  if (loading) return <main className="mx-auto min-h-screen max-w-6xl space-y-4 p-6"><div className="h-10 w-64 animate-pulse rounded bg-surface-container-low" /><div className="h-40 animate-pulse rounded-lg bg-surface-container-low" /></main>;
  if (!patient) return <main className="flex min-h-screen items-center justify-center p-6"><div className="w-full max-w-md space-y-4"><StatusAlert>{error || "No se encontró la ficha."}</StatusAlert><button onClick={loadPatient} className="button-primary w-full">Reintentar</button></div></main>;

  return (
    <div className="min-h-screen bg-surface">
      <ClinicalHeader compact right={<Link href="/doctor/patients" className="button-quiet">Volver a pacientes</Link>} />
      <DoctorWorkspace>
      <main className="mx-auto w-full min-w-0 max-w-7xl space-y-7 px-5 py-8 sm:px-8 sm:py-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="eyebrow">Ficha longitudinal</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{patient.nombre} {patient.apellido}</h1><p className="mt-2 text-sm text-on-surface-variant">{patient.document_type ? `${DOCUMENT_TYPE_LABELS[patient.document_type]} ${maskDocument(patient.document_number)} · ` : "Sin documento · "}{evaluations.length} {evaluations.length === 1 ? "evaluación registrada" : "evaluaciones registradas"}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditing((current) => !current)} className="button-secondary">{editing ? "Cancelar edición" : "Editar datos"}</button><button onClick={() => { void exportPatient(patient).catch(() => setError("No se pudo exportar la evolución en Excel.")); }} disabled={!evaluations.length} className="button-secondary">Exportar evolución</button><ScanTestModal patientId={id} onSaved={loadPatient} /><button onClick={createLink} disabled={creatingLink} className="button-primary">{creatingLink ? "Generando…" : "Nueva evaluación"}</button></div>
        </header>

        {error && <StatusAlert>{error}{duplicatePatientId && <> <Link href={`/doctor/patients/${duplicatePatientId}`} className="font-bold underline">Abrir la ficha existente</Link></>}</StatusAlert>}

        {editing && (
          <section className="clinical-card overflow-hidden" aria-labelledby="identity-title">
            <div className="border-b border-outline-variant/25 px-5 py-5 sm:px-6"><p className="eyebrow">Identificación</p><h2 id="identity-title" className="mt-1 text-xl font-bold">Editar datos del paciente</h2><p className="mt-1 text-sm text-on-surface-variant">El documento evita crear fichas duplicadas. Puedes dejarlo vacío en registros antiguos.</p></div>
            <form onSubmit={saveIdentity} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-[1fr_1fr_190px_1fr_auto] lg:items-end">
              <label><span className="clinical-label">Nombre</span><input required maxLength={80} value={editNombre} onChange={(event) => setEditNombre(event.target.value)} className="clinical-input" /></label>
              <label><span className="clinical-label">Apellido</span><input required maxLength={80} value={editApellido} onChange={(event) => setEditApellido(event.target.value)} className="clinical-input" /></label>
              <label><span className="clinical-label">Tipo de documento</span><select value={editDocumentType} onChange={(event) => setEditDocumentType(event.target.value as DocumentType)} className="clinical-input"><option value="dni">DNI</option><option value="ce">Carné de extranjería</option><option value="passport">Pasaporte</option></select></label>
              <label><span className="clinical-label">Número (opcional)</span><input inputMode={editDocumentType === "dni" ? "numeric" : "text"} maxLength={18} value={editDocumentNumber} onChange={(event) => setEditDocumentNumber(event.target.value)} placeholder={editDocumentType === "dni" ? "8 dígitos" : "6 a 15 caracteres"} className="clinical-input" /></label>
              <button disabled={saving} className="button-primary">{saving ? "Guardando…" : "Guardar"}</button>
            </form>
          </section>
        )}

        {generatedLink && (
          <section className="clinical-card border-primary/25 bg-primary-container/30 p-5 sm:p-6" aria-live="polite">
            <p className="font-bold">Enlace listo para {patient.nombre}</p>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center"><div className="min-w-0 flex-1 rounded-lg bg-white px-4 py-3"><p className="truncate text-sm" title={generatedLink.url}>{generatedLink.url}</p><p className="mt-1 text-xs text-on-surface-variant">Vence el {new Date(generatedLink.expiresAt).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}</p></div><button onClick={copyLink} className="button-secondary">{copyState === "copied" ? "Copiado ✓" : "Copiar enlace"}</button></div>
            {copyState === "error" && <p className="mt-2 text-xs font-semibold text-error">No se pudo copiar automáticamente.</p>}
          </section>
        )}

        {!latest ? (
          <section className="clinical-card px-6 py-14 text-center"><h2 className="text-xl font-bold">Sin evaluaciones todavía</h2><p className="mt-2 text-sm text-on-surface-variant">Genera un enlace para establecer la primera línea base del paciente.</p></section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Resumen más reciente">
              <SummaryCard label="Estilo de afrontamiento" value={latest.result?.copingStyle?.style ?? "Sin dato"} previous={previous?.result?.copingStyle?.style} />
              <SummaryCard label="Trío negativo" value={latest.result?.negativeTrio?.levelLabel ?? "Sin dato"} previous={previous?.result?.negativeTrio?.levelLabel} />
              <SummaryCard label="Duración" value={formatDuration(latest.total_execution_seconds)} previous={previous ? formatDuration(previous.total_execution_seconds) : undefined} />
              <SummaryCard label="Respuesta promedio" value={`${Number(latest.average_response_seconds || 0).toFixed(2)} s`} previous={previous ? `${Number(previous.average_response_seconds || 0).toFixed(2)} s` : undefined} />
            </section>

            <section className="clinical-card overflow-hidden" aria-labelledby="dimensions-title">
              <div className="border-b border-outline-variant/25 px-5 py-5 sm:px-6"><p className="eyebrow">Comparación</p><h2 id="dimensions-title" className="mt-1 text-xl font-bold">Dimensiones de afrontamiento</h2><p className="mt-1 text-sm text-on-surface-variant">La evaluación más reciente se compara con la inmediatamente anterior.</p></div>
              <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
                {(["conocimiento", "planeamiento", "enfrentamiento"] as const).map((dimension) => {
                  const current = latest.result?.copingStyle?.dimensions?.[dimension] ?? "Sin dato";
                  const before = previous?.result?.copingStyle?.dimensions?.[dimension];
                  return <SummaryCard key={dimension} label={dimension} value={current} previous={before} />;
                })}
              </div>
            </section>

            <section className="clinical-card overflow-hidden" aria-labelledby="matrix-title">
              <div className="border-b border-outline-variant/25 px-5 py-5 sm:px-6"><p className="eyebrow">Dato objetivo</p><h2 id="matrix-title" className="mt-1 text-xl font-bold">Evolución de rankings</h2><p className="mt-1 text-sm text-on-surface-variant">1–3: preferencia · 4–6: zona intermedia · 7–9: rechazo.</p></div>
              <div className="overflow-x-auto p-5 sm:p-6">
                <table className="w-full min-w-[760px] text-center text-sm">
                  <thead><tr><th className="pb-3 text-left text-xs uppercase text-on-surface-variant">Fecha</th>{RANKING_CODES.map((code) => <th key={code} className="pb-3 text-xs font-bold text-on-surface-variant">{code}</th>)}</tr></thead>
                  <tbody>{evaluations.map((evaluation) => <tr key={evaluation.id} className="border-t border-outline-variant/20"><td className="py-3 pr-4 text-left text-xs font-semibold">{new Date(evaluation.created_at).toLocaleDateString("es-PE", { dateStyle: "medium" })}</td>{RANKING_CODES.map((code) => <td key={code} className="p-1.5"><span className={`inline-flex h-8 w-8 items-center justify-center rounded font-extrabold ${rankClass(evaluation.rankings?.[code])}`}>{evaluation.rankings?.[code] ?? "–"}</span></td>)}</tr>)}</tbody>
                </table>
              </div>
            </section>

            <section className="clinical-card overflow-hidden" aria-labelledby="history-title">
              <div className="border-b border-outline-variant/25 px-5 py-5 sm:px-6"><p className="eyebrow">Cronología</p><h2 id="history-title" className="mt-1 text-xl font-bold">Historial de evaluaciones</h2></div>
              <div className="divide-y divide-outline-variant/25">{evaluations.map((evaluation, index) => <article key={evaluation.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_1fr_auto] md:items-center md:px-6"><div><p className="font-bold">{new Date(evaluation.created_at).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })}</p><p className="mt-1 text-xs text-on-surface-variant">{index === 0 ? "Evaluación más reciente" : `Evaluación anterior ${index}`}{evaluation.source_type === "imported" && <span className="ml-2 inline-flex rounded-full bg-primary-container px-2 py-0.5 font-bold text-primary">Importada por escaneo</span>}</p></div><div className="text-sm"><p>{evaluation.result?.copingStyle?.style ?? "Sin estilo disponible"}</p><p className="mt-1 text-xs text-on-surface-variant">{evaluation.result?.negativeTrio?.dominantLabel ?? "Sin dominante"} · {formatDuration(evaluation.total_execution_seconds)}</p></div><Link href={`/doctor/report/${evaluation.id}`} className="button-secondary">Ver informe</Link></article>)}</div>
            </section>

            <StatusAlert tone="info">La evolución muestra cambios descriptivos entre aplicaciones. No constituye por sí sola un diagnóstico clínico.</StatusAlert>
          </>
        )}
      </main>
      </DoctorWorkspace>
    </div>
  );
}

function SummaryCard({ label, value, previous }: { label: string; value: string; previous?: string }) {
  const changed = previous != null && previous !== value;
  return <article className="clinical-card p-5"><p className="text-[10px] font-extrabold uppercase tracking-wide text-on-surface-variant">{label}</p><p className="mt-2 text-lg font-extrabold capitalize">{value}</p>{previous == null ? <p className="mt-2 text-xs text-on-surface-variant">Línea base</p> : <p className={`mt-2 text-xs font-semibold ${changed ? "text-amber-700" : "text-success"}`}>{changed ? `Antes: ${previous}` : "Sin cambio respecto a la anterior"}</p>}</article>;
}
