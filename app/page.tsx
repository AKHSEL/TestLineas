"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState("Masculino");
  const [estadoCivil, setEstadoCivil] = useState("Soltero/a");
  const [ocupacion, setOcupacion] = useState("");
  const [estudios, setEstudios] = useState("");
  const [convivientes, setConvivientes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function handleComenzar(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!nombre.trim()) errs.push("Nombre");
    if (!apellido.trim()) errs.push("Apellido");
    if (!edad.trim() || isNaN(Number(edad)) || Number(edad) < 1) errs.push("Edad válida");
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    sessionStorage.setItem(
      "userData",
      JSON.stringify({ nombre: nombre.trim(), apellido: apellido.trim(), edad, sexo, estadoCivil, ocupacion, estudios, convivientes })
    );
    router.push("/test");
  }

  return (
    <>
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 glass-nav shadow-sm dark:shadow-none">
        <div className="flex justify-between items-center px-8 py-4 max-w-full mx-auto">
          <div className="text-xl font-semibold text-sky-900 dark:text-sky-100 tracking-tight">
            Test de las Líneas
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a
              className="text-sky-900 dark:text-sky-300 font-medium border-b-2 border-sky-700 transition-colors duration-300"
              href="#"
            >
              Instrucciones
            </a>
            <a
              className="text-slate-500 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-200 transition-colors duration-300"
              href="#"
            >
              Sobre el Test
            </a>
            <button
              onClick={handleComenzar}
              className="bg-linear-to-br from-primary to-primary-dim text-on-primary px-6 py-2 rounded-md font-medium hover:opacity-90 transition-all"
            >
              Comenzar
            </button>
          </nav>
          <div className="md:hidden">
            <span className="material-symbols-outlined text-primary">menu</span>
          </div>
        </div>
      </header>

      <main className="grow pt-32 pb-24 px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-8">
            <section>
              <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-4">
                Evaluación Psicológica
              </h1>
              <p className="text-base text-on-surface-variant leading-relaxed">
                Bienvenido al protocolo de evaluación. Este instrumento permite
                analizar la percepción espacial y las preferencias visuales a
                través del ordenamiento de estímulos lineales.
              </p>
            </section>

            {/* Instructions Card */}
            <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
              <div className="flex items-center space-x-3 text-primary">
                <span className="material-symbols-outlined">info</span>
                <h2 className="font-semibold uppercase tracking-wider text-sm">
                  Instrucciones
                </h2>
              </div>
              <p className="text-on-surface-variant leading-relaxed text-sm">
                Debe ordenar los nueve cuadrados según su preferencia. Comience
                eligiendo el que más le guste y continúe sucesivamente hasta
                llegar al que menos le agrade. No hay respuestas correctas o
                incorrectas, solo su apreciación personal.
              </p>
              <div className="grid grid-cols-3 gap-2 opacity-40 select-none">
                <div className="aspect-square bg-surface-container-highest rounded-lg flex items-center justify-center">
                  <div className="w-1/2 h-0.5 bg-on-surface rotate-45"></div>
                </div>
                <div className="aspect-square bg-surface-container-highest rounded-lg flex items-center justify-center">
                  <div className="w-1/2 h-0.5 bg-on-surface"></div>
                </div>
                <div className="aspect-square bg-surface-container-highest rounded-lg flex items-center justify-center">
                  <div className="w-1/2 h-0.5 bg-on-surface -rotate-45"></div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl h-48 bg-surface-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Interior clínico minimalista"
                className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-20"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgQ93S-cMa2yodoRCUcva9b9Nvq85UJ4IPA4zxWbpcYU_nsKP9HAkuazmoMO-PREXZyM8kH8Rlm6QtEey3mngKz2Xh5JEiDeffUkaFeK8wAQ6pI9f-trB_fhHISmYRIjXVAf4rOoJIswmGfqmIfotpsLjxLPfjQfzYhYc0TkUL1QbG-PfUoMxHQXFMuAqmoxMojmGGZkBG8HedhEj7-l-Qr3w-YP7XpcOZ17-IAzLxFqnEOiBr0B5e7SuSyq3joGpf3Jjbug697RHp"
              />
              <div className="relative z-10 p-6 flex flex-col justify-end h-full">
                <span className="text-xs font-bold text-primary tracking-widest uppercase mb-1">
                  Entorno Seguro
                </span>
                <p className="text-xs text-on-surface-variant">
                  Sus datos están protegidos bajo estricto secreto profesional.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-8">
            <div className="bg-surface-container-lowest rounded-xl p-10 ambient-shadow ghost-border">
              <div className="mb-10 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-semibold text-on-surface mb-2">
                    Protocolo de Registro
                  </h2>
                  <p className="text-on-surface-variant text-sm">
                    Complete los campos de filiación antes de proceder al test.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-outline uppercase">
                    Formulario ID
                  </span>
                  <p className="text-sm font-mono text-on-surface">
                    TL-2024-0812
                  </p>
                </div>
              </div>

              <form className="space-y-8" onSubmit={handleComenzar}>
                {/* Error banner */}
                {errors.length > 0 && (
                  <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                    Campos requeridos: {errors.join(", ")}
                  </div>
                )}

                {/* Personal Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface tracking-tight">
                      Nombre <span className="text-rose-500">*</span>
                    </label>
                    <input
                      className="w-full bg-surface-container-low border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary-fixed transition-all"
                      placeholder="Ej. Juan"
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface tracking-tight">
                      Apellido <span className="text-rose-500">*</span>
                    </label>
                    <input
                      className="w-full bg-surface-container-low border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary-fixed transition-all"
                      placeholder="Ej. Pérez"
                      type="text"
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface tracking-tight">
                      Edad <span className="text-rose-500">*</span>
                    </label>
                    <input
                      className="w-full bg-surface-container-low border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary-fixed transition-all"
                      placeholder="00"
                      type="number"
                      min={1}
                      max={120}
                      value={edad}
                      onChange={(e) => setEdad(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface tracking-tight">
                      Sexo
                    </label>
                    <select
                      className="w-full bg-surface-container-low border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary-fixed transition-all text-on-surface-variant"
                      value={sexo}
                      onChange={(e) => setSexo(e.target.value)}
                    >
                      <option>Masculino</option>
                      <option>Femenino</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface tracking-tight">
                      Estado Civil
                    </label>
                    <select
                      className="w-full bg-surface-container-low border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary-fixed transition-all text-on-surface-variant"
                      value={estadoCivil}
                      onChange={(e) => setEstadoCivil(e.target.value)}
                    >
                      <option>Soltero/a</option>
                      <option>Casado/a</option>
                      <option>Divorciado/a</option>
                      <option>Viudo/a</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface tracking-tight">
                      Ocupación
                    </label>
                    <input
                      className="w-full bg-surface-container-low border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary-fixed transition-all"
                      placeholder="Ej. Estudiante"
                      type="text"
                      value={ocupacion}
                      onChange={(e) => setOcupacion(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface tracking-tight">
                      Estudios / Profesión
                    </label>
                    <input
                      className="w-full bg-surface-container-low border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary-fixed transition-all"
                      placeholder="Ej. Grado en Psicología"
                      type="text"
                      value={estudios}
                      onChange={(e) => setEstudios(e.target.value)}
                    />
                  </div>
                </div>

                {/* Household Context */}
                <div className="space-y-4 pt-4">
                  <label className="text-sm font-semibold text-on-surface tracking-tight flex items-center space-x-2">
                    <span className="material-symbols-outlined text-primary text-base">
                      house
                    </span>
                    <span>¿Con quienes vives en tu casa?</span>
                  </label>
                  <textarea
                    className="w-full bg-surface-container-low border-none rounded-md px-4 py-3 focus:ring-2 focus:ring-primary-fixed transition-all"
                    placeholder="Mencione las personas y su relación..."
                    rows={3}
                    value={convivientes}
                    onChange={(e) => setConvivientes(e.target.value)}
                  />
                </div>

                {/* Visual Grid Placeholder */}
                <div className="p-8 border-2 border-dashed border-outline-variant/30 rounded-xl test-grid-pattern flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-3 bg-surface-container-low rounded-full">
                    <span className="material-symbols-outlined text-primary text-3xl">
                      grid_view
                    </span>
                  </div>
                  <div>
                    <p className="text-on-surface font-medium">
                      Espacio de Prueba
                    </p>
                    <p className="text-on-surface-variant text-xs">
                      El área interactiva se habilitará al comenzar.
                    </p>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-6">
                  <div className="flex items-center space-x-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">
                      verified_user
                    </span>
                    <span className="text-xs">* Campos obligatorios</span>
                  </div>
                  <button
                    type="submit"
                    className="bg-linear-to-br from-primary to-primary-dim text-on-primary px-10 py-4 rounded-md font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center space-x-3"
                  >
                    <span>Comenzar</span>
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 mt-auto bg-slate-50 dark:bg-slate-950 border-t border-slate-200/20 dark:border-slate-800/20">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 max-w-7xl mx-auto space-y-4 md:space-y-0">
          <div className="text-sm font-normal text-slate-500 dark:text-slate-400">
            © 2024 Test de las Líneas. Protocolo de Evaluación Psicológica.
          </div>
          <div className="flex space-x-8 text-sm font-normal text-slate-500 dark:text-slate-400">
            <a className="hover:underline transition-all" href="#">
              Privacidad
            </a>
            <a className="hover:underline transition-all" href="#">
              Términos
            </a>
            <a className="hover:underline transition-all" href="#">
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
