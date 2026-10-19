"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusAlert } from "@/app/components/clinical-ui";
import type { AZCode } from "@/lib/scoring";
import type { ScanAnalysis } from "@/lib/test-scanner";

const CODES: AZCode[] = ["A1Z", "A2Z", "A3Z", "A4Z", "A5Z", "A6Z", "A7Z", "A8Z", "A9Z"];

type Props = { patientId: string; onSaved?: () => void };
type ApiError = { error?: string };

async function readJson<T>(response: Response) { return response.json().catch(() => null) as Promise<T | null>; }

export function ScanTestModal({ patientId, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [values, setValues] = useState<Record<AZCode, number | "">>({} as Record<AZCode, number | "">);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duplicateValues = useMemo(() => {
    const numbers = CODES.map((code) => values[code]).filter((value): value is number => typeof value === "number");
    return numbers.filter((value, index) => numbers.indexOf(value) !== index);
  }, [values]);
  const complete = CODES.every((code) => Number.isInteger(values[code]) && Number(values[code]) >= 1 && Number(values[code]) <= 9) && duplicateValues.length === 0;
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function reset() { setOpen(false); setFile(null); setAnalysis(null); setValues({} as Record<AZCode, number | "">); setError(null); setBusy(false); }

  async function analyze() {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch(`/api/doctor/patients/${patientId}/scan/analyze`, { method: "POST", body });
      const data = await readJson<{ analysis?: ScanAnalysis } & ApiError>(response);
      if (!response.ok || !data?.analysis) throw new Error(data?.error || "No se pudo analizar el PDF.");
      setAnalysis(data.analysis);
      setValues(Object.fromEntries(CODES.map((code) => [code, data.analysis?.readings.find((reading) => reading.code === code)?.value ?? ""])) as Record<AZCode, number | "">);
    } catch (analyzeError) { setError(analyzeError instanceof Error ? analyzeError.message : "No se pudo analizar el PDF."); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!file || !complete) return;
    setBusy(true); setError(null);
    try {
      const body = new FormData(); body.append("file", file); body.append("rankings", JSON.stringify(values));
      const response = await fetch(`/api/doctor/patients/${patientId}/scan/confirm`, { method: "POST", body });
      const data = await readJson<ApiError>(response);
      if (!response.ok) throw new Error(data?.error || "No se pudo guardar la evaluación.");
      onSaved?.(); reset();
    } catch (confirmError) { setError(confirmError instanceof Error ? confirmError.message : "No se pudo guardar la evaluación."); }
    finally { setBusy(false); }
  }

  return <>
    <button type="button" onClick={() => { setOpen(true); setError(null); }} className="button-primary">Escanear test</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) reset(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="scan-test-title" className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-start justify-between border-b border-outline-variant/25 px-5 py-5 sm:px-6"><div><p className="eyebrow">Importación local</p><h2 id="scan-test-title" className="mt-1 text-xl font-bold">Escanear test</h2><p className="mt-1 text-sm text-on-surface-variant">Carga el PDF de la plantilla y revisa los nueve números antes de guardarlo.</p></div><button type="button" disabled={busy} onClick={reset} className="button-quiet">Cerrar</button></div>
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-[420px] rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">{previewUrl ? <iframe title="Vista previa del PDF" src={previewUrl} className="h-[58vh] min-h-[390px] w-full rounded-lg bg-white" /> : <div className="flex h-full min-h-[390px] items-center justify-center text-center text-sm text-on-surface-variant">La vista previa del PDF aparecerá aquí.</div>}</div>
          <div className="space-y-4">
            {!analysis && <><label className="block"><span className="clinical-label">Archivo PDF</span><input type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setAnalysis(null); setError(null); }} className="clinical-input file:mr-3 file:rounded file:border-0 file:bg-primary-container file:px-3 file:py-2 file:font-bold" /></label><p className="text-xs text-on-surface-variant">Máximo 10 MB. El archivo se procesa dentro del servidor.</p><button type="button" disabled={!file || busy} onClick={analyze} className="button-primary w-full">{busy ? "Analizando…" : "Analizar PDF"}</button></>}
            {analysis && <><div className="rounded-lg border border-outline-variant/30 bg-white p-4"><p className="text-sm font-bold">Revisión necesaria</p><p className="mt-1 text-xs text-on-surface-variant">Corrige los valores marcados antes de confirmar. Los números no pueden repetirse.</p></div><div className="space-y-2">{CODES.map((code) => { const reading = analysis.readings.find((item) => item.code === code); const review = reading?.needsReview || duplicateValues.includes(Number(values[code])); return <label key={code} className={`flex items-center gap-3 rounded-lg border p-3 ${review ? "border-amber-300 bg-amber-50" : "border-outline-variant/30 bg-white"}`}><span className="w-12 font-bold">{code}</span><input type="number" min={1} max={9} value={values[code]} onChange={(event) => setValues((current) => ({ ...current, [code]: event.target.value ? Number(event.target.value) : "" }))} className="clinical-input w-20" aria-label={`Número para ${code}`} /><span className="ml-auto text-right text-xs text-on-surface-variant">{reading?.confidence ?? 0}%{review && <span className="block font-bold text-amber-700">Revisar</span>}</span></label>; })}</div><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => { setAnalysis(null); setError(null); }} className="button-secondary flex-1">Elegir otro</button><button type="button" disabled={busy || !complete} onClick={confirm} className="button-primary flex-1">{busy ? "Guardando…" : "Confirmar"}</button></div></>}
            {error && <StatusAlert>{error}</StatusAlert>}
          </div>
        </div>
      </section>
    </div>}
  </>;
}
