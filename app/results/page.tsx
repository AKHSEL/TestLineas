"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TestResult } from "@/lib/scoring";

const TIME_PROFILE_BG: Record<string, string> = {
  rapido:    "bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200",
  normal:    "bg-violet-100 dark:bg-violet-950/40 text-violet-800 dark:text-violet-200",
  analitico: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200",
};

const NEGATIVE_LEVEL_BG: Record<string, string> = {
  muy_activo:          "bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200",
  regularmente_activo: "bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-200",
  poco_activo:         "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200",
  casi_desactivado:    "bg-lime-100 dark:bg-lime-950/40 text-lime-800 dark:text-lime-200",
  desactivado:         "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200",
};

const PRIORITY_COLORS = ["text-rose-600", "text-amber-600", "text-emerald-600"];

const NEGATIVE_ZONE_BADGE: Record<string, string> = {
  alta_preferencia: "bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
  indiferencia:     "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
  alto_rechazo:     "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function SectionCard({ letter, title, children }: { letter: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10 bg-surface-container-low">
        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
          {letter}
        </span>
        <h3 className="font-semibold text-on-surface text-sm uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem("testResult");
    if (!raw) { router.replace("/"); return; }
    try { setResult(JSON.parse(raw)); } catch { router.replace("/"); return; }
    setLoading(false);
  }, [router]);

  if (loading || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-on-surface-variant animate-pulse">Cargando resultados…</span>
      </div>
    );
  }

  const { userData, claveAfrontamiento, copingStyle, negativeTrio, threePairs, individualPositions, time, timestamp } = result;

  // First and last chosen lines
  const firstLine = individualPositions.find((p) => p.rank === 1)!;
  const lastLine  = individualPositions.find((p) => p.rank === 9)!;

  // Negative lines for section e)
  const negLines = negativeTrio.prioridades
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map((p) => ({
      ...p,
      position: individualPositions.find((ip) => ip.code === p.code)!,
    }));

  return (
    <>
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 glass-nav shadow-sm dark:shadow-none">
        <div className="flex justify-between items-center px-8 py-4 max-w-full mx-auto">
          <div className="text-xl font-semibold text-sky-900 dark:text-sky-100 tracking-tight">
            Test de las Líneas
          </div>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors font-medium text-sm"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Nueva evaluación
          </button>
        </div>
      </header>

      <main className="grow pt-28 pb-20 px-6 max-w-4xl mx-auto w-full space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Informe de Resultados</p>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
              {userData.nombre} {userData.apellido}
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {userData.edad} años · {userData.sexo} · {userData.estadoCivil}
              {userData.ocupacion && ` · ${userData.ocupacion}`}
            </p>
          </div>
          <div className="text-right text-sm text-on-surface-variant shrink-0">
            <p className="font-medium">{formatDate(timestamp)}</p>
            {time && (
              <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold ${TIME_PROFILE_BG[time.profile]}`}>
                {time.label}
              </span>
            )}
          </div>
        </div>

        {/* ── Coping Style card (KEEP) ── */}
        <section className="bg-surface-container-lowest rounded-2xl p-8 ambient-shadow ghost-border space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Estilo de Afrontamiento</p>
              <h2 className="text-4xl font-black text-on-surface tracking-tight">{copingStyle.style}</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["conocimiento", "planeamiento", "enfrentamiento"] as const).map((dim) => (
                <span key={dim} className="px-3 py-1 rounded-full bg-primary-fixed/30 text-primary text-xs font-semibold">
                  {copingStyle.dimensions[dim]}
                </span>
              ))}
            </div>
          </div>
          <p className="text-on-surface-variant leading-relaxed">{copingStyle.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {[
              { label: "Conocimiento",   value: copingStyle.dimensions.conocimiento   },
              { label: "Planeamiento",   value: copingStyle.dimensions.planeamiento   },
              { label: "Enfrentamiento", value: copingStyle.dimensions.enfrentamiento },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-container-low rounded-xl p-4 text-center">
                <p className="text-xs text-on-surface-variant uppercase tracking-widest font-medium">{label}</p>
                <p className="text-lg font-bold text-on-surface mt-1">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── RESULTADOS DE LAS LÍNEAS ARQUETIPCAS ── */}
        <div className="pt-2">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
            Resultados de las Líneas Arquetipcas
          </p>
          <div className="space-y-4">

            {/* a) Clave de Afrontamiento */}
            <SectionCard letter="a" title="Clave de Afrontamiento">
              <p className="font-mono text-3xl font-black text-on-surface tracking-[0.25em]">
                {claveAfrontamiento}
              </p>
              <p className="text-xs text-on-surface-variant mt-2">
                Secuencia de elección (cuadros 1–9 del protocolo en orden de preferencia)
              </p>
            </SectionCard>

            {/* b) Interpretación Individual */}
            <SectionCard letter="b" title="Interpretación Individual">
              <p className="text-xs text-on-surface-variant mb-3 italic">
                El estilo de enfrentar los conflictos, problemas y/o peligros potenciales o reales, es el siguiente:
              </p>
              <div className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm">
                  {firstLine.code.replace('Z', '')}
                </span>
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
                    {firstLine.code} — {firstLine.name} · Elección #1
                  </p>
                  <p className="text-sm text-on-surface leading-relaxed">{firstLine.interpretation}</p>
                </div>
              </div>
            </SectionCard>

            {/* c) Interpretación por Pares */}
            <SectionCard letter="c" title="Interpretación por Pares">
              <p className="text-xs text-on-surface-variant mb-3 italic">
                Su estilo de afrontamiento en tres aspectos que corresponden a:
              </p>
              <ul className="space-y-2">
                {[threePairs.par1, threePairs.par2, threePairs.par3].map((pair, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="shrink-0 mt-1 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-sm text-on-surface leading-relaxed">{pair.description}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>

            {/* d) Clave de Afrontamiento Negativo */}
            <SectionCard letter="d" title="Clave de Afrontamiento Negativo">
              <p className="text-xs text-on-surface-variant mb-3 italic">
                Su estilo de declive tendría la siguiente secuencia:
              </p>
              <div className="space-y-2">
                {negativeTrio.prioridades.map((p) => (
                  <div key={p.code} className="flex items-center gap-4 bg-surface-container-low rounded-lg px-4 py-3">
                    <span className="font-mono text-sm font-bold text-on-surface w-8">{p.code.replace('Z','')}</span>
                    <span className="text-xs text-on-surface-variant">Prioridad</span>
                    <span className={`text-xl font-black w-6 text-center ${PRIORITY_COLORS[p.priority - 1]}`}>
                      {p.priority}
                    </span>
                    <span className="flex-1 text-sm text-on-surface">{p.conductaLabel}</span>
                    <span className="text-xs text-outline font-mono">rank {p.rank}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* e) Intensidad del Afrontamiento Negativo */}
            <SectionCard letter="e" title="Intensidad del Afrontamiento Negativo">
              <p className="text-xs text-on-surface-variant mb-3 italic">
                Su estilo de afrontamiento negativo o desorganizativo tiene la siguiente intensidad:
              </p>
              <div className="space-y-2">
                {negLines.map(({ code, priority, position }) => (
                  <div key={code} className="flex items-start gap-3">
                    <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-xs font-bold ${NEGATIVE_ZONE_BADGE[position.zone]}`}>
                      P{priority}
                    </span>
                    <p className="text-sm text-on-surface leading-relaxed">{position.interpretation}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* f) Interpretación del Trío Negativo */}
            <SectionCard letter="f" title="Interpretación del Trío Negativo">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-center">
                  <span className="text-4xl font-black text-on-surface">{negativeTrio.sum}</span>
                  <p className="text-xs text-on-surface-variant">/ 24</p>
                </div>
                <div className="flex-1 space-y-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${NEGATIVE_LEVEL_BG[negativeTrio.level]}`}>
                    {negativeTrio.levelLabel}
                  </span>
                  <p className="text-sm text-on-surface leading-relaxed">{negativeTrio.levelText}</p>
                </div>
              </div>
            </SectionCard>

            {/* g) Interpretación de las líneas más rechazadas */}
            <SectionCard letter="g" title="Interpretación de las Líneas más Rechazadas">
              <div className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center font-black text-rose-600 dark:text-rose-400 text-sm">
                  {lastLine.code.replace('Z', '')}
                </span>
                <div>
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
                    {lastLine.code} — {lastLine.name} · Elección #9 (más rechazada)
                  </p>
                  <p className="text-sm text-on-surface leading-relaxed">{lastLine.interpretation}</p>
                </div>
              </div>
            </SectionCard>

          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface hover:bg-surface-container transition-all font-medium"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Imprimir informe
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-linear-to-br from-primary to-primary-dim text-on-primary font-semibold hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Nueva evaluación
          </button>
        </div>
      </main>

      <footer className="w-full py-8 mt-auto bg-slate-50 dark:bg-slate-950 border-t border-slate-200/20 dark:border-slate-800/20">
        <div className="flex justify-center px-12 max-w-4xl mx-auto">
          <div className="text-sm font-normal text-slate-500 dark:text-slate-400">
            © 2024 Test de las Líneas · Protocolo de Evaluación Psicológica · J.L. Pereyra Q.
          </div>
        </div>
      </footer>
    </>
  );
}
