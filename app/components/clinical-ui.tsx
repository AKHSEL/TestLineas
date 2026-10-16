import type { ReactNode } from "react";
import Image from "next/image";

export function BrandMark({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Test de las Líneas">
      <span className={`${compact ? "h-11 w-11" : "h-14 w-14"} flex shrink-0 items-center justify-center rounded-full ${inverse ? "bg-white" : "bg-white/80"}`}>
        <Image src="/brand/inspector-mark.svg" alt="" width={52} height={52} className="h-full w-full object-contain p-1" unoptimized />
      </span>
      <span className="leading-tight">
        <span className={`block font-display text-[15px] font-semibold tracking-tight ${inverse ? "text-white" : "text-on-surface"}`}>Test de las Líneas</span>
        <span className={`block text-[11px] ${inverse ? "text-white/70" : "text-on-surface-variant"}`}>Evaluación psicológica</span>
      </span>
    </div>
  );
}

export function ClinicalHeader({ right, compact = false }: { right?: ReactNode; compact?: boolean }) {
  return (
    <header className="border-b border-outline-variant/45 bg-white">
      <div className={`${compact ? "py-3" : "py-4"} mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8`}>
        <BrandMark compact={compact} />
        {right}
      </div>
    </header>
  );
}

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const labels = ["Consentimiento", "Datos", "Evaluación"];
  return (
    <nav aria-label="Progreso de la evaluación" className="w-full">
      <ol className="grid grid-cols-3 gap-2">
        {labels.map((label, index) => {
          const step = index + 1;
          const active = step === current;
          const complete = step < current;
          return (
            <li key={label} className="min-w-0">
              <div className={`mb-2 h-0.5 ${active || complete ? "bg-primary" : "bg-surface-container-high"}`} />
              <span className={`block truncate text-[11px] font-medium sm:text-xs ${active ? "text-primary" : complete ? "text-on-surface" : "text-on-surface-variant"}`}>
                <span className="sr-only">Paso {step}: </span>{label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function StatusAlert({ children, tone = "error", id }: { children: ReactNode; tone?: "error" | "success" | "info"; id?: string }) {
  const styles = {
    error: "border-error/25 bg-error-container text-error",
    success: "border-success/25 bg-success-container text-success",
    info: "border-primary/20 bg-primary-container/70 text-on-primary-container",
  };
  return <div id={id} role={tone === "error" ? "alert" : "status"} className={`rounded border px-4 py-3 text-sm leading-relaxed ${styles[tone]}`}>{children}</div>;
}

export function PageFooter() {
  return (
    <footer className="border-t border-outline-variant/25 bg-white py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 text-xs text-on-surface-variant sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>Test de las Líneas</span>
        <span>Uso reservado para evaluación profesional</span>
      </div>
    </footer>
  );
}
