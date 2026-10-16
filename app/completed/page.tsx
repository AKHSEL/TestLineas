import { BrandMark } from "@/app/components/clinical-ui";

export default function CompletedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-5">
      <section className="clinical-card w-full max-w-lg overflow-hidden text-center">
        <div className="border-b border-outline-variant/25 bg-success-container px-6 py-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-success/20 bg-white text-2xl font-extrabold text-success" aria-hidden="true">✓</div>
          <p className="eyebrow mt-5 !text-success">Envío confirmado</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Evaluación completada</h1>
        </div>
        <div className="space-y-5 px-6 py-8 sm:px-10">
          <p className="text-sm leading-6 text-on-surface-variant">Tus respuestas fueron enviadas correctamente al profesional responsable. Los resultados no se muestran en este sitio.</p>
          <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low/60 px-4 py-3 text-sm font-semibold">Ya puedes cerrar esta ventana.</div>
          <div className="flex justify-center pt-2"><BrandMark compact /></div>
        </div>
      </section>
    </main>
  );
}
