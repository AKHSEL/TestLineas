"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { BrandMark, StatusAlert } from "@/app/components/clinical-ui";

function DoctorLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("El acceso profesional no está configurado. Revisa las variables de Supabase.");
      setLoading(false);
      return;
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("El correo o la contraseña no son correctos.");
      setLoading(false);
      return;
    }
    router.push("/doctor/dashboard");
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,0.85fr)_minmax(440px,1.15fr)]">
      <section className="hidden flex-col justify-between bg-on-surface px-12 py-10 text-white lg:flex">
        <BrandMark inverse />
        <div className="max-w-md">
          <p className="text-sm font-medium text-white/65">Área profesional</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight">Evaluación y seguimiento</h1>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/75">Pacientes, resultados e informes del Test de las Líneas en un mismo registro.</p>
        </div>
        <p className="border-t border-white/20 pt-5 text-xs text-white/65">Acceso reservado al profesional responsable</p>
      </section>

      <section className="flex items-center justify-center bg-surface px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><BrandMark /></div>
          <form onSubmit={submit} className="clinical-card space-y-6 p-6 sm:p-8" aria-describedby={error ? "login-error" : undefined}>
            <div>
              <p className="eyebrow">Acceso privado</p>
              <h2 className="mt-2 text-3xl font-semibold">Panel profesional</h2>
              <p className="mt-2 text-sm text-on-surface-variant">Ingresa con tus credenciales autorizadas.</p>
            </div>
            {searchParams.get("reason") === "session_expired" && !error && <StatusAlert id="login-error" tone="info">Tu sesión expiró. Ingresa nuevamente para continuar.</StatusAlert>}
            {error && <StatusAlert id="login-error">{error}</StatusAlert>}
            <div>
              <label htmlFor="email" className="clinical-label">Correo electrónico</label>
              <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="clinical-input" />
            </div>
            <div>
              <label htmlFor="password" className="clinical-label">Contraseña</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="clinical-input pr-20" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-1 my-1 min-w-16 rounded px-2 text-xs font-bold text-primary hover:bg-primary-container" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? "Ocultar" : "Mostrar"}</button>
              </div>
            </div>
            <button disabled={loading} className="button-primary w-full">{loading ? "Ingresando…" : "Ingresar al panel"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function DoctorLoginPage() {
  return <Suspense fallback={<main className="min-h-screen bg-surface" />}><DoctorLoginContent /></Suspense>;
}
