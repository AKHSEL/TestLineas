"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
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
    </aside>
  );
}

export function DoctorWorkspace({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen"><DoctorTabs />{children}</div>;
}
