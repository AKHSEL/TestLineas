"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClinicalHeader, StatusAlert } from "@/app/components/clinical-ui";
import { DoctorWorkspace } from "@/app/doctor/_components/doctor-tabs";
import { Patient, PatientList, PatientRegistrationForm } from "@/app/doctor/_components/patient-directory";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isLicenseReadOnly, type TestLicense } from "@/lib/license";

type Invitation = { token: string; expires_at: string; created_at: string };

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [license, setLicense] = useState<TestLicense | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const loadPatients = useCallback(async () => {
    setLoading(true); setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setError("El panel no está configurado. Revisa las variables de Supabase."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/doctor?reason=session_expired"); return; }
    try {
      const [patientsResponse, invitationsResponse, licenseResponse] = await Promise.all([fetch("/api/doctor/patients"), fetch("/api/doctor/links"), fetch("/api/doctor/license", { cache: "no-store" })]);
      if (patientsResponse.status === 401 || invitationsResponse.status === 401 || licenseResponse.status === 401) { router.replace("/doctor?reason=session_expired"); return; }
      const [patientData, invitationData] = await Promise.all([patientsResponse.json().catch(() => null), invitationsResponse.json().catch(() => null)]);
      if (!patientsResponse.ok || !Array.isArray(patientData)) throw new Error(patientData?.error || "No se pudieron leer los pacientes.");
      if (!invitationsResponse.ok || !Array.isArray(invitationData)) throw new Error(invitationData?.error || "No se pudieron leer las invitaciones.");
      setPatients(patientData);
      setInvitations(invitationData);
      setLicense(licenseResponse.ok ? await licenseResponse.json() as TestLicense : null);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudo conectar con el servidor."); } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { void loadPatients(); }, [loadPatients]);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const readOnly = isLicenseReadOnly(license);
  async function logout() { await createSupabaseBrowserClient()?.auth.signOut(); router.replace("/doctor"); }

  async function createInvitation() {
    setCreatingInvitation(true); setError(null); setCopiedToken(null);
    try {
      const response = await fetch("/api/doctor/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (response.status === 401) { router.replace("/doctor?reason=session_expired"); return; }
      const data = await response.json().catch(() => null) as { token?: string; expires_at?: string; error?: string } | null;
      if (!response.ok || !data?.token || !data.expires_at) throw new Error(data?.error || "No se pudo generar el enlace.");
      setInvitations((current) => [{ token: data.token!, expires_at: data.expires_at!, created_at: new Date().toISOString() }, ...current]);
    } catch (invitationError) {
      setError(invitationError instanceof Error ? invitationError.message : "No se pudo generar el enlace.");
    } finally { setCreatingInvitation(false); }
  }

  async function copyInvitation(token: string) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/?token=${token}`); setCopiedToken(token); }
    catch { setError("No se pudo copiar el enlace."); }
  }

  return <div className="min-h-screen bg-surface"><ClinicalHeader compact right={<button onClick={logout} className="button-quiet">Cerrar sesión</button>} /><DoctorWorkspace><main className="mx-auto w-full min-w-0 max-w-7xl space-y-7 px-5 py-8 sm:px-8 sm:py-10">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow">Área profesional</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Pacientes</h1><p className="mt-2 text-sm text-on-surface-variant">Directorio completo, búsqueda y seguimiento longitudinal.</p></div>{!loading && <div className="rounded-lg border border-outline-variant/35 bg-white px-4 py-3"><span className="block text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Pacientes registrados</span><span className="mt-1 block text-2xl font-extrabold text-primary">{patients.length}</span></div>}</header>
    {error && <StatusAlert>{error} <button type="button" onClick={loadPatients} className="ml-1 font-bold underline">Reintentar</button></StatusAlert>}
    {!loading && readOnly && <StatusAlert tone="info">Modo solo lectura: puedes consultar las fichas, abrir informes y exportarlos. Para nuevas evaluaciones, renueva la licencia.</StatusAlert>}
    {!readOnly && <section className="clinical-card space-y-4 p-5 sm:p-6" aria-labelledby="invite-patient-title">
      <div><p className="eyebrow">Paciente nuevo</p><h2 id="invite-patient-title" className="mt-1 text-xl font-bold">Invitar a registrarse</h2><p className="mt-1 text-sm text-on-surface-variant">Envía un enlace para que el paciente ingrese sus datos y realice la prueba. El enlace vence en 24 horas.</p></div>
      <button type="button" onClick={createInvitation} disabled={creatingInvitation} className="button-primary">{creatingInvitation ? "Generando…" : "Generar enlace"}</button>
      {invitations.length > 0 && <div className="space-y-3"><p className="clinical-label">Invitaciones vigentes</p>{invitations.map((invitation) => <div key={invitation.token} className="rounded-lg border border-outline-variant/30 p-3"><div className="flex flex-col gap-2 sm:flex-row"><input aria-label="Enlace para el paciente" readOnly value={`${origin}/?token=${invitation.token}`} className="clinical-input min-w-0 flex-1" /><button type="button" onClick={() => copyInvitation(invitation.token)} className="button-secondary">{copiedToken === invitation.token ? "Copiado" : "Copiar enlace"}</button></div><p className="mt-2 text-xs text-on-surface-variant">Disponible hasta {new Date(invitation.expires_at).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}.</p></div>)}</div>}
    </section>}
    {!readOnly && <PatientRegistrationForm onCreated={(patient) => setPatients((current) => [...current, patient])} />}
    <section className="clinical-card overflow-hidden" aria-labelledby="patients-title-heading"><div className="flex flex-col gap-4 border-b border-outline-variant/25 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6"><div><p className="eyebrow">Seguimiento</p><h2 id="patients-title-heading" className="mt-1 text-xl font-bold">Directorio de pacientes</h2></div><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, apellido o documento" aria-label="Buscar por nombre, apellido o documento" className="clinical-input sm:w-80" /></div><PatientList patients={patients} loading={loading} query={query} /></section>
  </main></DoctorWorkspace></div>;
}
