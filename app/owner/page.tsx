"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ClinicalHeader, StatusAlert } from "@/app/components/clinical-ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type License = { user_id: string; email: string; status: "active" | "suspended" | null; valid_until: string | null; updated_at: string | null };

export default function OwnerPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/owner/licenses", { cache: "no-store" });
    if (response.status === 401) { setSession(false); setError(null); return; }
    if (response.status === 403) { setError("Esta cuenta no tiene acceso a la administración de licencias."); return; }
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data)) { setError("No se pudieron cargar las licencias."); return; }
    setSession(true); setLicenses(data); setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const client = createSupabaseBrowserClient();
      const { data: { user } } = client ? await client.auth.getUser() : { data: { user: null } };
      if (cancelled) return;
      if (user) await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(null);
    const client = createSupabaseBrowserClient();
    const result = client ? await client.auth.signInWithPassword({ email, password }) : { error: new Error("Servicio no configurado") };
    setPassword("");
    if (result.error) setError("No se pudo iniciar sesión. Verifica las credenciales.");
    else await refresh();
    setLoading(false);
  }

  async function save(license: License) {
    setSaving(license.user_id); setError(null);
    const response = await fetch("/api/owner/licenses", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: license.user_id, status: license.status, validUntil: license.valid_until }),
    });
    if (!response.ok) setError("No se pudo guardar el cambio. Intenta nuevamente.");
    else await refresh();
    setSaving(null);
  }

  async function logout() {
    await createSupabaseBrowserClient()?.auth.signOut();
    setSession(false); setLicenses([]); setEmail(""); setError(null);
  }

  return <div className="min-h-screen bg-surface">
    <ClinicalHeader compact right={session ? <button onClick={logout} className="button-quiet">Cerrar sesión</button> : null} />
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="eyebrow">Acceso del propietario</p>
      <h1 className="mt-2 text-3xl font-semibold">Licencias del Test de Líneas</h1>
      <p className="mt-2 text-sm text-on-surface-variant">Activa o suspende cuentas y define el último día de uso en horario de Perú.</p>
      {error && <div className="mt-6"><StatusAlert>{error}</StatusAlert></div>}
      {loading ? <p className="mt-8">Cargando…</p> : !session ?
        <form onSubmit={login} className="clinical-card mt-8 max-w-md space-y-5 p-6">
          <h2 className="text-xl font-semibold">Ingresar como propietario</h2>
          <div><label className="clinical-label" htmlFor="owner-email">Correo</label><input id="owner-email" className="clinical-input" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label className="clinical-label" htmlFor="owner-password">Contraseña</label><input id="owner-password" className="clinical-input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button className="button-primary">Ingresar</button>
        </form> :
        <section className="mt-8 space-y-4" aria-label="Cuentas y licencias">
          {licenses.map(license => <div className="clinical-card grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_170px_190px_auto] md:items-end" key={license.user_id}>
            <div><p className="font-semibold break-all">{license.email}</p><p className="mt-1 text-xs text-on-surface-variant">{license.status === null ? "Sin licencia" : license.status === "suspended" ? "Suspendida" : license.valid_until && license.valid_until < new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) ? "Vencida" : "Activa"}</p></div>
            <div><label className="clinical-label" htmlFor={`status-${license.user_id}`}>Estado</label><select id={`status-${license.user_id}`} className="clinical-input" value={license.status ?? "active"} onChange={e => setLicenses(rows => rows.map(row => row.user_id === license.user_id ? { ...row, status: e.target.value as License["status"] } : row))}><option value="active">Activa</option><option value="suspended">Suspendida</option></select></div>
            <div><label className="clinical-label" htmlFor={`date-${license.user_id}`}>Último día de uso</label><input id={`date-${license.user_id}`} className="clinical-input" type="date" value={license.valid_until ?? ""} onChange={e => setLicenses(rows => rows.map(row => row.user_id === license.user_id ? { ...row, valid_until: e.target.value || null } : row))} /><p className="mt-1 text-xs text-on-surface-variant">Vacío = sin vencimiento</p></div>
            <button type="button" className="button-primary" disabled={saving !== null} onClick={() => void save(license)}>{saving === license.user_id ? "Guardando…" : "Guardar"}</button>
          </div>)}
          {licenses.length === 0 && <p>No hay cuentas de clientes todavía.</p>}
        </section>}
    </main>
  </div>;
}
