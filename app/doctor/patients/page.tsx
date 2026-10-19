"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClinicalHeader, StatusAlert } from "@/app/components/clinical-ui";
import { DoctorWorkspace } from "@/app/doctor/_components/doctor-tabs";
import { Patient, PatientList, PatientRegistrationForm } from "@/app/doctor/_components/patient-directory";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async () => {
    setLoading(true); setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setError("El panel no está configurado. Revisa las variables de Supabase."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/doctor?reason=session_expired"); return; }
    try {
      const response = await fetch("/api/doctor/patients");
      if (response.status === 401) { router.replace("/doctor?reason=session_expired"); return; }
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data)) throw new Error(data?.error || "No se pudieron leer los pacientes.");
      setPatients(data);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudo conectar con el servidor."); } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { void loadPatients(); }, [loadPatients]);
  async function logout() { await createSupabaseBrowserClient()?.auth.signOut(); router.replace("/doctor"); }

  return <div className="min-h-screen bg-surface"><ClinicalHeader compact right={<button onClick={logout} className="button-quiet">Cerrar sesión</button>} /><DoctorWorkspace><main className="mx-auto w-full min-w-0 max-w-7xl space-y-7 px-5 py-8 sm:px-8 sm:py-10">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow">Área profesional</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Pacientes</h1><p className="mt-2 text-sm text-on-surface-variant">Directorio completo, búsqueda y seguimiento longitudinal.</p></div>{!loading && <div className="rounded-lg border border-outline-variant/35 bg-white px-4 py-3"><span className="block text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Pacientes registrados</span><span className="mt-1 block text-2xl font-extrabold text-primary">{patients.length}</span></div>}</header>
    {error && <StatusAlert>{error} <button type="button" onClick={loadPatients} className="ml-1 font-bold underline">Reintentar</button></StatusAlert>}
    <PatientRegistrationForm onCreated={(patient) => setPatients((current) => [...current, patient])} />
    <section className="clinical-card overflow-hidden" aria-labelledby="patients-title-heading"><div className="flex flex-col gap-4 border-b border-outline-variant/25 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6"><div><p className="eyebrow">Seguimiento</p><h2 id="patients-title-heading" className="mt-1 text-xl font-bold">Directorio de pacientes</h2></div><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, apellido o documento" aria-label="Buscar por nombre, apellido o documento" className="clinical-input sm:w-80" /></div><PatientList patients={patients} loading={loading} query={query} /></section>
  </main></DoctorWorkspace></div>;
}
