import { doctorApiError, logSupabaseFailure, requireActiveDoctor, requireDoctor } from "@/lib/supabase/doctor-auth";
import { analyzeTestPdf, MAX_SCAN_BYTES } from "@/lib/test-scanner";

export const runtime = "nodejs";
export const maxDuration = 60;

async function getPatient(auth: Awaited<ReturnType<typeof requireDoctor>> & { ok: true }, id: string) {
  const { data, error } = await auth.supabase
    .from("patients")
    .select("id, nombre, apellido")
    .eq("id", id)
    .single();
  if (error || !data) {
    if (error) logSupabaseFailure("patient-scan:patient", error);
    return null;
  }
  return data;
}

export async function POST(request: Request, { params }: RouteContext<"/api/doctor/patients/[id]/scan/analyze">) {
  const auth = await requireActiveDoctor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const patient = await getPatient(auth, id);
  if (!patient) return doctorApiError("Paciente no encontrado.", "NOT_FOUND", 404);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return doctorApiError("Selecciona un archivo PDF.", "WRITE_FAILED", 400);
  if (file.size === 0 || file.size > MAX_SCAN_BYTES) return doctorApiError("El PDF debe pesar entre 1 byte y 10 MB.", "WRITE_FAILED", 400);
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return doctorApiError("Solo se aceptan archivos PDF.", "WRITE_FAILED", 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  if (header !== "%PDF-") return doctorApiError("El archivo no parece ser un PDF válido.", "WRITE_FAILED", 400);

  try {
    const analysis = await analyzeTestPdf(bytes);
    return Response.json({ patient, analysis });
  } catch (error) {
    console.error("[patient-scan:analyze]", error);
    return doctorApiError("No se pudo analizar el PDF. Revisa que use la plantilla del test.", "WRITE_FAILED", 422);
  }
}
