"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { daysUntilLicenseExpiry, isLicenseReadOnly, type TestLicense } from "@/lib/license";

const sections = [
  { label: "Panel", href: "/doctor/dashboard", icon: "panel" },
  { label: "Pacientes", href: "/doctor/patients", icon: "patients" },
  { label: "Tesis", href: "/doctor/thesis", icon: "thesis" },
] as const;

function SectionIcon({ name }: { name: (typeof sections)[number]["icon"] }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };

  if (name === "panel") return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
  if (name === "patients") return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20H3.5Z" /><path d="M16 5.3a3 3 0 0 1 0 5.4M17 14a4.5 4.5 0 0 1 3.5 4.4V20H18" /></svg>;
  return <svg {...common}><path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" /><path d="M14 3.5V8h4M8 12h7M8 16h7" /></svg>;
}

export function DoctorTabs() {
  const pathname = usePathname();
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [license, setLicense] = useState<TestLicense | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [licenseError, setLicenseError] = useState(false);
  const doctorName = process.env.NEXT_PUBLIC_DOCTOR_NAME || "Profesional responsable";
  const doctorEmail = process.env.NEXT_PUBLIC_DOCTOR_EMAIL;
  const doctorPhone = process.env.NEXT_PUBLIC_DOCTOR_PHONE;

  async function openLicense() {
    setLicenseOpen(true);
    setLicenseLoading(true);
    setLicenseError(false);
    try {
      const response = await fetch("/api/doctor/license", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo consultar la licencia.");
      setLicense(await response.json() as TestLicense);
    } catch {
      setLicenseError(true);
      setLicense(null);
    } finally {
      setLicenseLoading(false);
    }
  }

  const daysRemaining = daysUntilLicenseExpiry(license);
  const licenseStatus = license?.status === "suspended" ? "Suspendida"
    : license?.status === "missing" ? "Sin activar"
    : isLicenseReadOnly(license) ? "Vencida" : "Vigente";
  const expiry = license?.valid_until
    ? license.valid_until.split("-").reverse().join("/")
    : "Sin fecha de vencimiento";

  return (
    <>
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-outline-variant/25 bg-white px-2 py-6 lg:w-56 lg:px-4">
      <p className="hidden px-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant lg:block">Área profesional</p>
      <nav aria-label="Navegación profesional" className="flex flex-col gap-1 lg:mt-5">
        {sections.map((section) => {
          const active = section.href === "/doctor/patients"
            ? pathname.startsWith(section.href)
            : pathname === section.href;
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-label={section.label}
              aria-current={active ? "page" : undefined}
              title={section.label}
              className={`flex h-11 items-center justify-center gap-3 rounded-md text-sm font-medium transition-colors lg:justify-start lg:px-3 ${active ? "bg-primary-container text-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"}`}
            >
              <SectionIcon name={section.icon} />
              <span className="hidden lg:inline">{section.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-outline-variant/25 pt-3">
        <button type="button" onClick={() => void openLicense()} aria-label="Ver información de licencia" title="Licencia" className="flex h-11 w-full items-center justify-center gap-3 rounded-md text-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary lg:justify-start lg:px-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h4" /></svg>
          <span className="hidden lg:inline">Licencia</span>
        </button>
      </div>
    </aside>
    {licenseOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLicenseOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setLicenseOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="license-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Test de las Líneas</p><h2 id="license-title" className="mt-2 text-2xl font-semibold">Tu licencia</h2></div><button type="button" autoFocus onClick={() => setLicenseOpen(false)} className="button-quiet" aria-label="Cerrar información de licencia">Cerrar</button></div>
        {licenseLoading ? <p className="mt-6 text-sm text-on-surface-variant">Consultando licencia…</p> : licenseError ? <p className="mt-6 text-sm text-error" role="alert">No se pudo consultar la licencia. Intenta abrirla de nuevo.</p> : <div className="mt-6 space-y-5">
          <div className="rounded-lg bg-surface-container-low p-4"><p className="text-xs text-on-surface-variant">Estado</p><p className="mt-1 font-semibold">{licenseStatus}</p><p className="mt-3 text-xs text-on-surface-variant">Último día de uso</p><p className="mt-1 font-semibold">{expiry}</p>{license && !isLicenseReadOnly(license) && daysRemaining !== null && daysRemaining <= 7 && <p className="mt-3 text-xs text-error">La licencia vence pronto.</p>}</div>
          <div><h3 className="text-sm font-semibold">Contacto del proveedor</h3><p className="mt-2 text-sm">{doctorName}</p>{doctorEmail && <a href={`mailto:${doctorEmail}`} className="mt-1 block break-all text-sm text-primary underline">{doctorEmail}</a>}{doctorPhone && <a href={`tel:${doctorPhone.replace(/[^\d+]/g, "")}`} className="mt-1 block text-sm text-primary underline">{doctorPhone}</a>}</div>
        </div>}
      </section>
    </div>}
    </>
  );
}

export function DoctorWorkspace({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen"><DoctorTabs />{children}</div>;
}
