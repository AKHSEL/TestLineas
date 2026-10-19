"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClinicalHeader, StatusAlert } from "@/app/components/clinical-ui";
import { DoctorWorkspace } from "@/app/doctor/_components/doctor-tabs";
import { Patient, PatientList } from "@/app/doctor/_components/patient-directory";
import { downloadExcelFile, type ExcelColumn } from "@/lib/excel-export";
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
  const [loading, setLoading] = useState(true);
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
  async function logout() { await createSupabaseBrowserClient()?.auth.signOut(); router.replace("/doctor"); }

  return <div className="min-h-screen bg-surface"><ClinicalHeader compact right={<button onClick={logout} className="button-quiet">Cerrar sesión</button>} /><DoctorWorkspace><main className="mx-auto w-full min-w-0 max-w-7xl space-y-7 px-5 py-8 sm:px-8 sm:py-10">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow">Área profesional</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Panel clínico</h1><p className="mt-2 text-sm text-on-surface-variant">Resumen de pacientes y evaluaciones.</p></div>{!loading && <div className="flex flex-wrap gap-5"><Stat label="Pacientes" value={patients.length} /><Stat label="Evaluaciones" value={evaluations.length} /></div>}</header>
    {error && <StatusAlert>{error} <button type="button" onClick={loadData} className="ml-1 font-bold underline">Reintentar</button></StatusAlert>}
    <section className="clinical-card overflow-hidden" aria-labelledby="recent-patients-title"><div className="flex flex-col gap-3 border-b border-outline-variant/25 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6"><div><p className="eyebrow">Seguimiento</p><h2 id="recent-patients-title" className="mt-1 text-xl font-bold">Pacientes recientes</h2><p className="mt-1 text-sm text-on-surface-variant">Accede rápidamente a las últimas fichas actualizadas.</p></div><Link href="/doctor/patients" className="button-secondary">Ver todos los pacientes</Link></div><PatientList patients={patients} loading={loading} preview /></section>
    <div className="flex justify-end"><button disabled={!evaluations.length} onClick={() => { void downloadExcel(evaluations).catch(() => setError("No se pudo exportar el historial en Excel.")); }} className="button-secondary">Exportar historial completo</button></div>
  </main></DoctorWorkspace></div>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="min-w-24 border-l border-outline-variant pl-4"><span className="block text-xs text-on-surface-variant">{label}</span><span className="mt-1 block text-2xl font-semibold text-on-surface">{value}</span></div>; }
