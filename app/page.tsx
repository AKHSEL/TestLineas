"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandMark, ClinicalHeader, PageFooter, StatusAlert, StepIndicator } from "@/app/components/clinical-ui";

type FieldErrors = Partial<Record<"nombre" | "apellido" | "edad", string>>;

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [sessionStatus, setSessionStatus] = useState<"loading" | "valid" | "invalid">(token ? "loading" : "invalid");
  const [linkedPatient, setLinkedPatient] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState("Masculino");
  const [estadoCivil, setEstadoCivil] = useState("Soltero/a");
  const [ocupacion, setOcupacion] = useState("");
  const [estudios, setEstudios] = useState("");
  const [convivientes, setConvivientes] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const doctorName = process.env.NEXT_PUBLIC_DOCTOR_NAME || "Profesional responsable";
  const doctorEmail = process.env.NEXT_PUBLIC_DOCTOR_EMAIL;
  const doctorPhone = process.env.NEXT_PUBLIC_DOCTOR_PHONE;

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetch(`/api/test/session?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("invalid");
        return response.json() as Promise<{ nombre: string | null; apellido: string | null }>;
      })
      .then((data) => {
        if (!active) return;
        if (data.nombre && data.apellido) {
          setNombre(data.nombre);
          setApellido(data.apellido);
          setLinkedPatient(true);
        }
        setSessionStatus("valid");
      })
      .catch(() => { if (active) setSessionStatus("invalid"); });
    return () => { active = false; };
  }, [token]);

  function continueToDetails() {
    if (consentAccepted) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleComenzar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!nombre.trim()) nextErrors.nombre = "Ingresa tu nombre.";
    if (!apellido.trim()) nextErrors.apellido = "Ingresa tu apellido.";
    const numericAge = Number(edad);
    if (!edad.trim() || !Number.isFinite(numericAge) || numericAge < 1 || numericAge > 120) {
      nextErrors.edad = "Ingresa una edad entre 1 y 120 años.";
    }

    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      window.setTimeout(() => document.getElementById(firstError)?.focus(), 0);
      return;
    }

    sessionStorage.setItem("userData", JSON.stringify({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      edad,
      sexo,
      estadoCivil,
      ocupacion: ocupacion.trim(),
      estudios: estudios.trim(),
      convivientes: convivientes.trim(),
    }));
    sessionStorage.removeItem("testOrder");
    router.push(`/test?token=${encodeURIComponent(token!)}`);
  }

  if (token && sessionStatus === "loading") {
    return <main className="flex min-h-screen items-center justify-center" aria-label="Validando enlace"><div className="h-8 w-8 animate-pulse rounded-full bg-primary-container" /></main>;
  }

  if (!token || sessionStatus === "invalid") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <section className="clinical-card w-full max-w-md p-8">
          <div className="mb-6 flex justify-center"><BrandMark /></div>
          <p className="eyebrow">Acceso no disponible</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Este enlace no es válido</h1>
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">Solicita un nuevo enlace al profesional responsable de tu evaluación.</p>
        </section>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <ClinicalHeader right={<span className="hidden rounded-full bg-primary-container px-3 py-1.5 text-xs font-bold text-on-primary-container sm:block">Sesión de evaluación</span>} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto mb-8 max-w-2xl"><StepIndicator current={step} /></div>

        {step === 1 ? (
          <section className="clinical-card mx-auto max-w-2xl overflow-hidden" aria-labelledby="consent-title">
            <div className="border-b border-outline-variant/45 px-6 py-7 sm:px-9">
              <p className="eyebrow">Antes de comenzar</p>
              <h1 id="consent-title" className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface">Tu evaluación</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant">Lee esta información con calma. La prueba consiste en ordenar nueve imágenes según tu preferencia personal.</p>
            </div>
            <div className="space-y-6 px-6 py-7 sm:px-9 sm:py-9">
              <div className="grid divide-y divide-outline-variant/35 border-y border-outline-variant/35 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {[
                  ["01", "Observa", "Mira cuidadosamente los nueve estímulos."],
                  ["02", "Ordena", "Elige desde el que más te gusta hasta el que menos."],
                  ["03", "Envía", "Confirma tu orden para finalizar."],
                ].map(([number, title, copy]) => (
                  <div key={number} className="p-4 sm:px-5">
                    <span className="text-xs font-semibold text-primary">{number}</span>
                    <h2 className="mt-2 text-sm font-semibold">{title}</h2>
                    <p className="mt-1 text-xs leading-5 text-on-surface-variant">{copy}</p>
                  </div>
                ))}
              </div>

              <StatusAlert tone="info">
                Los datos que ingreses y tus respuestas serán enviados a <strong>{doctorName}</strong> para su revisión profesional. Los resultados no se mostrarán en este dispositivo.
              </StatusAlert>

              {(doctorEmail || doctorPhone) && (
                <div className="rounded-lg border border-outline-variant/30 px-4 py-3 text-sm">
                  <p className="font-bold text-on-surface">Contacto responsable</p>
                  {doctorEmail && <p className="mt-1 text-on-surface-variant">{doctorEmail}</p>}
                  {doctorPhone && <p className="text-on-surface-variant">{doctorPhone}</p>}
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant/45 p-4 text-sm leading-6 hover:bg-surface-container-low/50">
                <input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-primary" />
                <span>He leído la información y acepto realizar esta evaluación y enviar mis respuestas al profesional responsable.</span>
              </label>

              <button type="button" onClick={continueToDetails} disabled={!consentAccepted} className="button-primary w-full sm:ml-auto sm:w-auto sm:min-w-40">Continuar</button>
            </div>
          </section>
        ) : (
          <section className="clinical-card mx-auto max-w-3xl" aria-labelledby="details-title">
            <div className="border-b border-outline-variant/25 px-6 py-6 sm:px-9">
              <p className="eyebrow">Paso 2 de 3</p>
              <h1 id="details-title" className="mt-2 text-2xl font-extrabold tracking-tight">Datos personales</h1>
              <p className="mt-2 text-sm text-on-surface-variant">Completa los campos obligatorios para iniciar la prueba.</p>
            </div>
            <form className="space-y-8 px-6 py-7 sm:px-9 sm:py-9" onSubmit={handleComenzar} noValidate>
              {Object.keys(errors).length > 0 && <StatusAlert>Revisa los campos indicados antes de continuar.</StatusAlert>}

              <fieldset>
                <legend className="mb-5 text-base font-bold">Información básica</legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nombre" className="clinical-label">Nombre <span className="text-error">*</span></label>
                    <input id="nombre" className="clinical-input read-only:bg-surface-container-low" autoComplete="given-name" value={nombre} readOnly={linkedPatient} onChange={(event) => setNombre(event.target.value)} aria-invalid={Boolean(errors.nombre)} aria-describedby={errors.nombre ? "nombre-error" : undefined} />
                    {errors.nombre && <p id="nombre-error" className="mt-1.5 text-xs font-medium text-error">{errors.nombre}</p>}
                  </div>
                  <div>
                    <label htmlFor="apellido" className="clinical-label">Apellido <span className="text-error">*</span></label>
                    <input id="apellido" className="clinical-input read-only:bg-surface-container-low" autoComplete="family-name" value={apellido} readOnly={linkedPatient} onChange={(event) => setApellido(event.target.value)} aria-invalid={Boolean(errors.apellido)} aria-describedby={errors.apellido ? "apellido-error" : undefined} />
                    {errors.apellido && <p id="apellido-error" className="mt-1.5 text-xs font-medium text-error">{errors.apellido}</p>}
                  </div>
                  <div>
                    <label htmlFor="edad" className="clinical-label">Edad <span className="text-error">*</span></label>
                    <input id="edad" className="clinical-input" inputMode="numeric" type="number" min={1} max={120} value={edad} onChange={(event) => setEdad(event.target.value)} aria-invalid={Boolean(errors.edad)} aria-describedby={errors.edad ? "edad-error" : undefined} />
                    {errors.edad && <p id="edad-error" className="mt-1.5 text-xs font-medium text-error">{errors.edad}</p>}
                  </div>
                  <div>
                    <label htmlFor="sexo" className="clinical-label">Sexo</label>
                    <select id="sexo" className="clinical-input" value={sexo} onChange={(event) => setSexo(event.target.value)}>
                      <option>Masculino</option><option>Femenino</option><option>Otro</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="estadoCivil" className="clinical-label">Estado civil</label>
                    <select id="estadoCivil" className="clinical-input" value={estadoCivil} onChange={(event) => setEstadoCivil(event.target.value)}>
                      <option>Soltero/a</option><option>Casado/a</option><option>Divorciado/a</option><option>Viudo/a</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              <fieldset className="border-t border-outline-variant/25 pt-7">
                <legend className="mb-1 text-base font-bold">Contexto personal</legend>
                <p className="mb-5 text-xs text-on-surface-variant">Estos campos son opcionales.</p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ocupacion" className="clinical-label">Ocupación</label>
                    <input id="ocupacion" className="clinical-input" autoComplete="organization-title" value={ocupacion} onChange={(event) => setOcupacion(event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="estudios" className="clinical-label">Estudios o profesión</label>
                    <input id="estudios" className="clinical-input" value={estudios} onChange={(event) => setEstudios(event.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="convivientes" className="clinical-label">¿Con quiénes vives?</label>
                    <textarea id="convivientes" className="clinical-input min-h-24 resize-y" rows={3} placeholder="Personas y relación contigo" value={convivientes} onChange={(event) => setConvivientes(event.target.value)} />
                  </div>
                </div>
              </fieldset>

              <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/25 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => setStep(1)} className="button-quiet">Volver</button>
                <button type="submit" className="button-primary sm:min-w-48">Comenzar evaluación <span aria-hidden="true">→</span></button>
              </div>
            </form>
          </section>
        )}
      </main>
      <PageFooter />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center" aria-label="Cargando"><div className="h-8 w-8 animate-pulse rounded-full bg-primary-container" /></main>}>
      <HomeContent />
    </Suspense>
  );
}
