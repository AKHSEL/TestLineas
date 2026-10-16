"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const tabs = [
  { label: "Panel", href: "/doctor/dashboard", hash: "" },
  { label: "Pacientes", href: "/doctor/patients", hash: "" },
  { label: "Evaluaciones pendientes", href: "/doctor/dashboard#pending-title", hash: "#pending-title" },
] as const;

export function DoctorTabs() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  return (
    <nav aria-label="Navegación profesional" className="border-b border-outline-variant/25 bg-white">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 sm:px-8">
        {tabs.map((tab) => {
          const active = tab.href === "/doctor/patients"
            ? pathname.startsWith("/doctor/patients")
            : pathname === "/doctor/dashboard"
              && (tab.hash === "" ? !hash : hash === tab.hash);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${active ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:border-primary/35 hover:text-primary"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
