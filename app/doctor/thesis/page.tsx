"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClinicalHeader, StatusAlert } from "@/app/components/clinical-ui";
import { DoctorWorkspace } from "@/app/doctor/_components/doctor-tabs";
import { downloadExcelFile, type ExcelColumn } from "@/lib/excel-export";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatThesisMoment, formatThesisProcessing, formatThesisSeconds, type ThesisRow } from "@/lib/thesis";

const COLUMNS: ExcelColumn[] = [
  { key: "paciente", label: "Paciente", width: 30 },
  { key: "inicio", label: "Inicio de prueba", width: 22, kind: "text" },
  { key: "finalizacion", label: "Finalización de prueba", width: 26, kind: "text" },
  { key: "resultado", label: "Resultado disponible", width: 24, kind: "text" },
  { key: "total", label: "Tiempo total del proceso evaluativo (segundos)", width: 34, kind: "integer" },
  { key: "procesamiento", label: "Tiempo de procesamiento del resultado (segundos)", width: 36, kind: "decimal", numFmt: "#,##0.000" },
  { key: "observacion", label: "Observación", width: 24, kind: "text" },
];

function timestamp(value: string | null) {
  return formatThesisMoment(value) || "Sin registro";
}

function duration(value: number | null) {
  return formatThesisSeconds(value) || "Sin registro";
}

export default function ThesisPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ThesisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("El panel no está configurado. Revisa las variables de Supabase.");
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/doctor?reason=session_expired");
      return;
    }
    try {
      const response = await fetch("/api/doctor/thesis");
      if (response.status === 401) {
        router.replace("/doctor?reason=session_expired");
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data)) throw new Error(data?.error || "No se pudieron cargar los datos de Tesis.");
      setRows(data as ThesisRow[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void loadRows(); }, [loadRows]);
  const patientCount = useMemo(() => new Set(rows.map((row) => row.patientId)).size, [rows]);

  async function exportExcel() {
    setExporting(true);
    setError(null);
    try {
      await downloadExcelFile({
        columns: COLUMNS,
        sheetName: "Tesis - hora Lima",
        fileName: "tesis-tiempos-test-de-lineas.xlsx",
        frozenColumns: 1,
        rows: rows.map((row) => ({
          paciente: row.patientName,
          inicio: formatThesisMoment(row.consentStartedAt),
          finalizacion: formatThesisMoment(row.confirmedAt),
          resultado: formatThesisMoment(row.resultAvailableAt),
          total: row.totalProcessSeconds,
          procesamiento: row.processingSeconds,
          observacion: row.processingSeconds === null ? formatThesisProcessing(row) : "",
        })),
      });
    } catch {
      setError("No se pudo exportar el archivo Excel.");
    } finally {
      setExporting(false);
    }
  }

  async function logout() {
    await createSupabaseBrowserClient()?.auth.signOut();
    router.replace("/doctor");
  }

  return <div className="min-h-screen bg-surface">
    <ClinicalHeader compact right={<button onClick={logout} className="button-quiet">Cerrar sesión</button>} />
    <DoctorWorkspace>
    <main className="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Área profesional</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Tesis</h1>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">Evaluaciones completadas mediante enlace por el participante y tiempos transcurridos hasta que el resultado queda disponible.</p>
        </div>
        <button type="button" onClick={() => { void exportExcel(); }} disabled={loading || exporting || rows.length === 0} className="button-primary">
          {exporting ? "Preparando Excel…" : "Exportar Excel"}
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="clinical-card px-5 py-4"><span className="text-xs text-on-surface-variant">Pacientes</span><strong className="mt-1 block text-2xl text-primary">{loading ? "—" : patientCount}</strong></div>
        <div className="clinical-card px-5 py-4"><span className="text-xs text-on-surface-variant">Evaluaciones registradas</span><strong className="mt-1 block text-2xl text-primary">{loading ? "—" : rows.filter((row) => row.evaluationId).length}</strong></div>
      </div>

      {error && <StatusAlert>{error} <button type="button" onClick={() => { void loadRows(); }} className="ml-1 font-bold underline">Reintentar</button></StatusAlert>}

      <section className="clinical-card overflow-hidden" aria-labelledby="thesis-table-title">
        <div className="border-b border-outline-variant/25 px-5 py-5 sm:px-6">
          <h2 id="thesis-table-title" className="text-xl font-bold">Registro de tiempos</h2>
        </div>
        {loading ? <div className="p-6 text-sm text-on-surface-variant">Cargando pacientes…</div> : rows.length === 0 ? <div className="p-6 text-sm text-on-surface-variant">Todavía no hay evaluaciones completadas mediante enlace.</div> :
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="bg-surface-container-low text-xs text-on-surface-variant">
                <tr>
                  <th scope="col" className="px-5 py-4">Paciente</th>
                  <th scope="col" className="px-4 py-4">Inicio de prueba</th>
                  <th scope="col" className="px-4 py-4">Finalización de prueba</th>
                  <th scope="col" className="px-4 py-4">Resultado disponible</th>
                  <th scope="col" className="px-4 py-4">Tiempo total del proceso evaluativo</th>
                  <th scope="col" className="px-4 py-4">Tiempo de procesamiento del resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {rows.map((row) => <tr key={row.evaluationId ?? row.patientId} className="align-top">
                  <td className="px-5 py-4 font-semibold"><Link href={`/doctor/patients/${row.patientId}`} className="text-primary hover:underline">{row.patientName}</Link></td>
                  <td className="whitespace-nowrap px-4 py-4 tabular-nums">{timestamp(row.consentStartedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-4 tabular-nums">{timestamp(row.confirmedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-4 tabular-nums">{timestamp(row.resultAvailableAt)}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums">{duration(row.totalProcessSeconds)}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums">{formatThesisProcessing(row) || "Sin registro"}</td>
                </tr>)}
              </tbody>
            </table>
          </div>}
      </section>
    </main>
    </DoctorWorkspace>
  </div>;
}
