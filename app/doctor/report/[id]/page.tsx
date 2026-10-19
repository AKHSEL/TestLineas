"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrandMark, StatusAlert } from "@/app/components/clinical-ui";

type PairResult = { label?: string; orientation?: string; description?: string };
type LinePosition = { code?: string; name?: string; rank: number; zoneLabel?: string; interpretation: string };
type StoredResult = {
  claveAfrontamiento?: string;
  copingStyle?: { style?: string; description?: string; dimensions?: { conocimiento?: string; planeamiento?: string; enfrentamiento?: string } };
  individualPositions?: LinePosition[];
  threePairs?: { par1?: PairResult; par2?: PairResult; par3?: PairResult };
  negativeTrio?: { levelLabel?: string; levelText?: string; dominantLabel?: string };
  time?: { label?: string } | null;
};
type Evaluation = {
  nombre: string;
  apellido: string;
  edad: string;
  sexo: string;
  estado_civil: string;
  ocupacion: string;
  estudios: string;
  convivientes: string;
  result: StoredResult;
  rankings: Record<string, number>;
  started_at: string;
  finished_at: string;
  total_execution_seconds: number;
  average_response_seconds: number;
  created_at?: string;
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes} min ${rest} s` : `${rest} s`;
}

export default function DoctorReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const doctorName = process.env.NEXT_PUBLIC_DOCTOR_NAME || "Profesional responsable";
  const doctorEmail = process.env.NEXT_PUBLIC_DOCTOR_EMAIL;
  const doctorPhone = process.env.NEXT_PUBLIC_DOCTOR_PHONE;

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/doctor/evaluations/${id}`);
      const data = await response.json().catch(() => null) as (Evaluation & { error?: string; code?: string }) | null;
      if (response.status === 401 || data?.code === "UNAUTHORIZED") {
        router.replace("/doctor?reason=session_expired");
        return;
      }
      if (!response.ok || !data) {
        throw new Error(data?.error || "No se pudo cargar la evaluación.");
      }
      setEvaluation(data);
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "No se pudo cargar la evaluación.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  if (loading) {
    return <main className="mx-auto min-h-screen max-w-4xl bg-white p-6 sm:p-10" aria-label="Cargando informe"><div className="space-y-4"><div className="h-12 w-56 animate-pulse rounded bg-surface-container-low" /><div className="h-36 animate-pulse rounded-lg bg-surface-container-low" /><div className="h-64 animate-pulse rounded-lg bg-surface-container-low" /></div></main>;
  }

  if (error || !evaluation) {
    return <main className="flex min-h-screen items-center justify-center p-6"><div className="w-full max-w-md space-y-4"><StatusAlert>{error || "No se encontró el informe."}</StatusAlert><button onClick={loadReport} className="button-primary w-full">Reintentar</button></div></main>;
  }

  const result = evaluation.result;
  const dimensions = result.copingStyle?.dimensions;
  const pairs = [
    ["Procesamiento", result.threePairs?.par1],
    ["Planeamiento", result.threePairs?.par2],
    ["Afrontamiento", result.threePairs?.par3],
  ] as const;
  const positions = [...(result.individualPositions ?? [])].sort((a, b) => a.rank - b.rank);
  const reportCode = id.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-surface py-0 sm:py-8 print:bg-white print:py-0">
      <div className="print-hidden mx-auto mb-4 flex max-w-4xl items-center justify-between gap-3 px-4 sm:px-0">
        <button onClick={() => router.back()} className="button-quiet">← Volver al historial</button>
        <button onClick={() => window.print()} className="button-primary">Imprimir o guardar PDF</button>
      </div>

      <main className="mx-auto max-w-4xl bg-white px-5 py-7 text-slate-900 shadow-sm sm:px-10 sm:py-10 print:max-w-none print:p-0 print:shadow-none">
        <header className="border-b-2 border-primary pb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <BrandMark />
            <div className="text-left sm:text-right">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Informe de resultados</p>
              <p className="mt-2 font-mono text-sm font-bold">N.º {reportCode}</p>
              <p className="mt-1 text-xs text-slate-500">Emitido: {new Date(evaluation.created_at || evaluation.finished_at).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })}</p>
            </div>
          </div>
        </header>

        <section className="report-section border-b border-slate-200 py-6" aria-labelledby="patient-heading">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">Datos de identificación</p>
          <h1 id="patient-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{evaluation.nombre} {evaluation.apellido}</h1>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-slate-500">Edad</dt><dd className="mt-1 font-semibold">{evaluation.edad} años</dd></div>
            <div><dt className="text-xs text-slate-500">Sexo</dt><dd className="mt-1 font-semibold">{evaluation.sexo}</dd></div>
            <div><dt className="text-xs text-slate-500">Estado civil</dt><dd className="mt-1 font-semibold">{evaluation.estado_civil}</dd></div>
            <div><dt className="text-xs text-slate-500">Ocupación</dt><dd className="mt-1 font-semibold">{evaluation.ocupacion || "No indicada"}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-slate-500">Estudios o profesión</dt><dd className="mt-1 font-semibold">{evaluation.estudios || "No indicados"}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-slate-500">Convivientes</dt><dd className="mt-1 font-semibold">{evaluation.convivientes || "No indicados"}</dd></div>
          </dl>
        </section>

        <section className="report-section py-6" aria-labelledby="summary-heading">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">Síntesis</p>
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary-container/35 p-5">
            <h2 id="summary-heading" className="text-xl font-extrabold text-slate-900">Estilo de afrontamiento: {result.copingStyle?.style || "Sin clasificación"}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">{result.copingStyle?.description || "No se registró una descripción."}</p>
            {dimensions && <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-primary/15 pt-4 text-xs"><div><dt className="text-slate-500">Conocimiento</dt><dd className="mt-1 font-bold text-primary">{dimensions.conocimiento}</dd></div><div><dt className="text-slate-500">Planeamiento</dt><dd className="mt-1 font-bold text-primary">{dimensions.planeamiento}</dd></div><div><dt className="text-slate-500">Enfrentamiento</dt><dd className="mt-1 font-bold text-primary">{dimensions.enfrentamiento}</dd></div></dl>}
          </div>
        </section>

        <section className="report-section border-y border-slate-200 py-6" aria-labelledby="metrics-heading">
          <h2 id="metrics-heading" className="text-lg font-extrabold">Métricas de aplicación</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-3"><dt className="text-[11px] text-slate-500">Clave</dt><dd className="mt-1 font-mono text-lg font-bold text-primary">{result.claveAfrontamiento || "—"}</dd></div>
            <div className="rounded-lg bg-slate-50 p-3"><dt className="text-[11px] text-slate-500">Duración total</dt><dd className="mt-1 text-lg font-bold">{formatDuration(evaluation.total_execution_seconds)}</dd></div>
            <div className="rounded-lg bg-slate-50 p-3"><dt className="text-[11px] text-slate-500">Respuesta promedio</dt><dd className="mt-1 text-lg font-bold">{Number(evaluation.average_response_seconds).toFixed(2)} s</dd></div>
            <div className="rounded-lg bg-slate-50 p-3"><dt className="text-[11px] text-slate-500">Perfil temporal</dt><dd className="mt-1 text-xs font-bold leading-5">{result.time?.label || "No disponible"}</dd></div>
          </dl>
        </section>

        <section className="report-section py-6" aria-labelledby="pairs-heading">
          <h2 id="pairs-heading" className="text-lg font-extrabold">Dimensiones interpretativas</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {pairs.map(([name, pair]) => <article key={name} className="rounded-lg border border-slate-200 p-4"><p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{name}</p><h3 className="mt-2 font-extrabold text-primary">{pair?.label || "—"}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{pair?.description || "Sin descripción disponible."}</p></article>)}
          </div>
        </section>

        {result.negativeTrio && <section className="report-section border-y border-slate-200 py-6" aria-labelledby="negative-heading"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">Indicadores complementarios</p><h2 id="negative-heading" className="mt-2 text-lg font-extrabold">Trío negativo: {result.negativeTrio.levelLabel || "Sin clasificación"}</h2><p className="mt-3 text-sm leading-6 text-slate-700">{result.negativeTrio.levelText}</p>{result.negativeTrio.dominantLabel && <p className="mt-3 text-xs text-slate-500"><strong>Indicador dominante:</strong> {result.negativeTrio.dominantLabel}</p>}</section>}

        <section className="py-6" aria-labelledby="positions-heading">
          <h2 id="positions-heading" className="text-lg font-extrabold">Orden e interpretación de estímulos</h2>
          <p className="mt-1 text-xs text-slate-500">Presentados desde la mayor hasta la menor preferencia.</p>
          <div className="mt-4 space-y-3">
            {positions.map((position) => <article key={`${position.code}-${position.rank}`} className="report-section grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-[50px_150px_1fr]"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">{position.rank}</div><div><h3 className="text-sm font-extrabold">{position.name || position.code}</h3><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-primary">{position.zoneLabel}</p></div><p className="text-xs leading-5 text-slate-600">{position.interpretation}</p></article>)}
          </div>
        </section>

        <footer className="report-section mt-2 border-t-2 border-primary pt-6 text-xs text-slate-500">
          <div className="grid gap-6 sm:grid-cols-2">
            <div><p className="font-bold text-slate-700">Datos de aplicación</p><p className="mt-2">Inicio: {new Date(evaluation.started_at).toLocaleString("es-PE")}</p><p>Finalización: {new Date(evaluation.finished_at).toLocaleString("es-PE")}</p></div>
            <div className="sm:text-right"><p className="font-bold text-slate-700">{doctorName}</p>{doctorEmail && <p className="mt-2">{doctorEmail}</p>}{doctorPhone && <p>{doctorPhone}</p>}</div>
          </div>
          <p className="mt-6 border-t border-slate-200 pt-4 leading-5">Este documento es un apoyo para la evaluación profesional. Sus resultados deben interpretarse junto con la información clínica disponible y no constituyen por sí solos un diagnóstico.</p>
        </footer>
      </main>
    </div>
  );
}
