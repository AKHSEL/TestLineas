import { doctorApiError, logSupabaseFailure, requireActiveDoctor } from "@/lib/supabase/doctor-auth";
import { calculateResult } from "@/lib/scoring";
import { MAX_SCAN_BYTES, validateScanRankings } from "@/lib/test-scanner";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: RouteContext<"/api/doctor/patients/[id]/scan/confirm">) {
  const auth = await requireActiveDoctor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const { data: patient, error: patientError } = await auth.supabase
    .from("patients")
    .select("id, nombre, apellido")
    .eq("id", id)
    .single();
  if (patientError || !patient) {
    if (patientError) logSupabaseFailure("patient-scan:confirm-patient", patientError);
    return doctorApiError("Paciente no encontrado.", "NOT_FOUND", 404);
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return doctorApiError("No se pudo leer el formulario.", "WRITE_FAILED", 400);
  const file = formData?.get("file");
  if (!(file instanceof File)) return doctorApiError("Falta el PDF original.", "WRITE_FAILED", 400);
  if (file.size === 0 || file.size > MAX_SCAN_BYTES) return doctorApiError("El PDF debe pesar entre 1 byte y 10 MB.", "WRITE_FAILED", 400);
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return doctorApiError("Solo se aceptan archivos PDF.", "WRITE_FAILED", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return doctorApiError("El archivo no parece ser un PDF válido.", "WRITE_FAILED", 400);

  let rankingsInput: unknown;
  try { rankingsInput = JSON.parse(String(formData.get("rankings") || "")); } catch { rankingsInput = null; }
  const validated = validateScanRankings(rankingsInput);
  if (!validated.ok) return doctorApiError(validated.error, "WRITE_FAILED", 400);

  const evaluationId = crypto.randomUUID();
  const sourcePath = `${auth.user.id}/${patient.id}/${evaluationId}.pdf`;
  const { error: uploadError } = await auth.supabase.storage
    .from("test-scans")
    .upload(sourcePath, file, { contentType: "application/pdf", cacheControl: "31536000", upsert: false });
  if (uploadError) {
    logSupabaseFailure("patient-scan:upload", uploadError);
    return doctorApiError("No se pudo conservar el PDF del escaneo.", "WRITE_FAILED", 500);
  }

  const userData = { nombre: patient.nombre, apellido: patient.apellido, edad: "", sexo: "", estadoCivil: "", ocupacion: "", estudios: "", convivientes: "" };
  const result = { ...calculateResult(validated.rankings, userData), importSource: "local_ocr", importedAt: new Date().toISOString() };
  const now = new Date().toISOString();
  const { data: link, error: linkError } = await auth.supabase
    .from("evaluation_links")
    .insert({ doctor_id: auth.user.id, patient_id: patient.id, status: "completed", expires_at: now, completed_at: now })
    .select("id")
    .single();
  if (linkError || !link) {
    await auth.supabase.storage.from("test-scans").remove([sourcePath]);
    if (linkError) logSupabaseFailure("patient-scan:link", linkError);
    return doctorApiError("No se pudo crear la evaluación importada.", "WRITE_FAILED", 500);
  }

  const { data: evaluation, error: evaluationError } = await auth.supabase
    .from("evaluations")
    .insert({
      id: evaluationId,
      link_id: link.id,
      doctor_id: auth.user.id,
      patient_id: patient.id,
      nombre: patient.nombre,
      apellido: patient.apellido,
      edad: "",
      sexo: "",
      estado_civil: "",
      ocupacion: "",
      estudios: "",
      convivientes: "",
      slots: validated.slots,
      rankings: validated.rankings,
      result,
      started_at: now,
      finished_at: now,
      total_execution_seconds: 0,
      first_response_times: [],
      average_response_seconds: 0,
      source_type: "imported",
      source_pdf_path: sourcePath,
    })
    .select("*")
    .single();
  if (evaluationError || !evaluation) {
    await auth.supabase.storage.from("test-scans").remove([sourcePath]);
    if (evaluationError) logSupabaseFailure("patient-scan:evaluation", evaluationError);
    return doctorApiError("No se pudo guardar la evaluación importada.", "WRITE_FAILED", 500);
  }

  return Response.json(evaluation, { status: 201 });
}
