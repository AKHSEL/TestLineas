import { doctorApiError, logSupabaseFailure, requireDoctor } from "@/lib/supabase/doctor-auth";

export async function POST(request: Request) {
  const auth = await requireDoctor();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null) as { patientId?: unknown } | null;
  if (typeof body?.patientId !== "string") {
    return doctorApiError("Genera el enlace desde una ficha de paciente.", "WRITE_FAILED", 400);
  }

  const { data: patient } = await auth.supabase.from("patients").select("id").eq("id", body.patientId).single();
  if (!patient) return doctorApiError("Paciente no encontrado.", "NOT_FOUND", 404);

  const { data, error } = await auth.supabase
    .from("evaluation_links")
    .insert({ doctor_id: auth.user.id, patient_id: patient.id })
    .select("token, expires_at")
    .single();

  if (error) {
    logSupabaseFailure("evaluation-links:create", error);
    return doctorApiError("No se pudo generar el enlace.", "WRITE_FAILED", 500);
  }

  return Response.json(data);
}
