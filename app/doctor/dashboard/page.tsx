"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClinicalHeader, StatusAlert } from "@/app/components/clinical-ui";
import { DoctorTabs } from "@/app/doctor/_components/doctor-tabs";
import { EmptyState, LoadingRows, Patient, PatientList } from "@/app/doctor/_components/patient-directory";
import { downloadExcelFile, type ExcelColumn } from "@/lib/excel-export";
import { DOCUMENT_TYPE_LABELS, maskDocument } from "@/lib/patients";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Evaluation = { id: string; patient_id: string | null; nombre: string; apellido: string; edad: string; sexo: string; estado_civil: string; ocupacion: string; estudios: string; convivientes: string; rankings: Record<string, number>; result: Record<string, unknown>; started_at: string; finished_at: string; total_execution_seconds: number; first_response_times: number[]; average_response_seconds: number; created_at: string };
type ApiError = { error?: string; code?: string };
async function readJson<T>(response: Response) { return response.json().catch(() => null) as Promise<T | null>; }

const HISTORY_COLUMNS: ExcelColumn[] = [
  { key: "id", label: "ID de evaluación", width: 38, kind: "text" },
  { key: "paciente_id", label: "ID de paciente", width: 38, kind: "text" },
  { key: "nombre", label: "Nombre", width: 22 },
  { key: "apellido", label: "Apellido", width: 22 },
  { key: "edad", label: "Edad", width: 12 },
  { key: "sexo", label: "Sexo", width: 16 },
  { key: "estado_civil", label: "Estado civil", width: 20 },
  { key: "ocupacion", label: "Ocupación", width: 24 },
  { key: "estudios", label: "Estudios", width: 24 },
  { key: "convivientes", label: "Convivientes", width: 24 },
  { key: "inicio", label: "Inicio", width: 27 },
  { key: "finalizacion", label: "Finalización", width: 27 },
  { key: "tiempo_total_segundos", label: "Tiempo total (s)", width: 18, kind: "decimal" },
  { key: "tiempo_promedio_estimulo", label: "Promedio por estímulo (s)", width: 24, kind: "decimal" },
  { key: "tiempos_por_estimulo", label: "Tiempos por estímulo", width: 46, wrap: true },
  { key: "rankings", label: "Rankings", width: 46, wrap: true },
  { key: "resultados", label: "Resultados", width: 60, wrap: true },
];

async function downloadExcel(rows: Evaluation[]) {
  const data = rows.map((evaluation) => ({ id: evaluation.id, paciente_id: evaluation.patient_id ?? "Sin asignar", nombre: evaluation.nombre, apellido: evaluation.apellido, edad: evaluation.edad, sexo: evaluation.sexo, estado_civil: evaluation.estado_civil, ocupacion: evaluation.ocupacion, estudios: evaluation.estudios, convivientes: evaluation.convivientes, inicio: evaluation.started_at, finalizacion: evaluation.finished_at, tiempo_total_segundos: evaluation.total_execution_seconds, tiempo_promedio_estimulo: evaluation.average_response_seconds, tiempos_por_estimulo: JSON.stringify(evaluation.first_response_times), rankings: JSON.stringify(evaluation.rankings), resultados: JSON.stringify(evaluation.result) }));
  await downloadExcelFile({ columns: HISTORY_COLUMNS, rows: data, sheetName: "Evaluaciones", fileName: "evaluaciones-test-de-lineas.xlsx" });
}

export default function DoctorDashboard() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setError("El panel no está configurado. Revisa las variables de Supabase."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/doctor?reason=session_expired"); return; }
    try {
      const [patientsResponse, evaluationsResponse] = await Promise.all([fetch("/api/doctor/patients"), fetch("/api/doctor/evaluations")]);
      if (patientsResponse.status === 401 || evaluationsResponse.status === 401) { router.replace("/doctor?reason=session_expired"); return; }
      const [patientData, evaluationData] = await Promise.all([readJson<Patient[] | ApiError>(patientsResponse), readJson<Evaluation[] | ApiError>(evaluationsResponse)]);
      if (!patientsResponse.ok || !Array.isArray(patientData) || !evaluationsResponse.ok || !Array.isArray(evaluationData)) throw new Error("No se pudieron leer los datos clínicos.");
      setPatients(patientData); setEvaluations(evaluationData);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudo conectar con el servidor."); } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { void loadData(); }, [loadData]);
  const pending = useMemo(() => evaluations.filter((evaluation) => !evaluation.patient_id), [evaluations]);
  async function assignEvaluation(evaluation: Evaluation) {
    const patientId = assignments[evaluation.id];
    if (!patientId || !window.confirm(`¿Asignar la evaluación de ${evaluation.nombre} ${evaluation.apellido} a la ficha seleccionada?`)) return;
    setAssigningId(evaluation.id); setError(null);
    try { const response = await fetch(`/api/doctor/evaluations/${evaluation.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId }) }); const data = await readJson<ApiError>(response); if (!response.ok) throw new Error(data?.error || "No se pudo asignar la evaluación."); await loadData(); }
    catch (assignError) { setError(assignError instanceof Error ? assignError.message : "No se pudo asignar la evaluación."); } finally { setAssigningId(null); }
  }
  async function logout() { await createSupabaseBrowserClient()?.auth.signOut(); router.replace("/doctor"); }

  return <div className="min-h-screen bg-surface"><ClinicalHeader compact right={<button onClick={logout} className="button-quiet">Cerrar sesión</button>} /><DoctorTabs /><main className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8 sm:py-10">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow">Área profesional</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Panel clínico</h1><p className="mt-2 text-sm text-on-surface-variant">Resumen de pacientes y evaluaciones pendientes.</p></div>{!loading && <div className="flex flex-wrap gap-5"><Stat label="Pacientes" value={patients.length} /><Stat label="Evaluaciones" value={evaluations.length} /><Stat label="Sin asignar" value={pending.length} /></div>}</header>
    {error && <StatusAlert>{error} <button type="button" onClick={loadData} className="ml-1 font-bold underline">Reintentar</button></StatusAlert>}
    <section className="clinical-card overflow-hidden" aria-labelledby="recent-patients-title"><div className="flex flex-col gap-3 border-b border-outline-variant/25 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6"><div><p className="eyebrow">Seguimiento</p><h2 id="recent-patients-title" className="mt-1 text-xl font-bold">Pacientes recientes</h2><p className="mt-1 text-sm text-on-surface-variant">Accede rápidamente a las últimas fichas actualizadas.</p></div><Link href="/doctor/patients" className="button-secondary">Ver todos los pacientes</Link></div><PatientList patients={patients} loading={loading} preview /></section>
    <section id="pending-title" className="clinical-card scroll-mt-6 overflow-hidden" aria-labelledby="pending-title-heading"><div className="border-b border-outline-variant/25 px-5 py-5 sm:px-6"><p className="eyebrow">Migración segura</p><h2 id="pending-title-heading" className="mt-1 text-xl font-bold">Evaluaciones sin asignar</h2><p className="mt-1 text-sm text-on-surface-variant">Vincula manualmente los registros anteriores para evitar mezclar personas por nombre.</p></div>{loading ? <LoadingRows /> : pending.length === 0 ? <EmptyState title="Todo está organizado" copy="No hay evaluaciones pendientes de asignación." /> : <div className="divide-y divide-outline-variant/25">{pending.map((evaluation) => <article key={evaluation.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_260px_auto] lg:items-center lg:px-6"><div><h3 className="font-bold">{evaluation.nombre} {evaluation.apellido}</h3><p className="mt-1 text-xs text-on-surface-variant">{new Date(evaluation.created_at).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })} · {evaluation.edad} años</p></div><select value={assignments[evaluation.id] ?? ""} onChange={(event) => setAssignments((current) => ({ ...current, [evaluation.id]: event.target.value }))} className="clinical-input" aria-label={`Paciente para ${evaluation.nombre} ${evaluation.apellido}`}><option value="">Seleccionar paciente</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.apellido}, {patient.nombre}{patient.document_type ? ` · ${DOCUMENT_TYPE_LABELS[patient.document_type]} ${maskDocument(patient.document_number)}` : ""}</option>)}</select><button type="button" disabled={!assignments[evaluation.id] || assigningId === evaluation.id} onClick={() => assignEvaluation(evaluation)} className="button-secondary">{assigningId === evaluation.id ? "Asignando…" : "Asignar"}</button></article>)}</div>}</section>
    <div className="flex justify-end"><button disabled={!evaluations.length} onClick={() => { void downloadExcel(evaluations).catch(() => setError("No se pudo exportar el historial en Excel.")); }} className="button-secondary">Exportar historial completo</button></div>
  </main></div>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="min-w-24 border-l border-outline-variant pl-4"><span className="block text-xs text-on-surface-variant">{label}</span><span className="mt-1 block text-2xl font-semibold text-on-surface">{value}</span></div>; }
