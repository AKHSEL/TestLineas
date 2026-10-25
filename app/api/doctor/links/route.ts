import { doctorApiError, logSupabaseFailure, requireActiveDoctor, requireDoctor } from "@/lib/supabase/doctor-auth";

export async function GET() {
  const auth = await requireDoctor();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase
    .from("evaluation_links")
    .select("token, expires_at, created_at")
    .eq("registration_required", true)
    .eq("status", "available")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) {
    logSupabaseFailure("evaluation-links:list-invitations", error);
    return doctorApiError("No se pudieron leer las invitaciones.", "READ_FAILED", 500);
  }
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireActiveDoctor();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null) as { patientId?: unknown } | null;
  if (body?.patientId != null && typeof body.patientId !== "string") {
    return doctorApiError("Paciente no válido.", "WRITE_FAILED", 400);
  }

  let patientId: string | null = null;
  if (body?.patientId) {
    const { data: patient } = await auth.supabase.from("patients").select("id").eq("id", body.patientId).single();
    if (!patient) return doctorApiError("Paciente no encontrado.", "NOT_FOUND", 404);
    patientId = patient.id;
  }

  const { data, error } = await auth.supabase
    .from("evaluation_links")
    .insert({ doctor_id: auth.user.id, patient_id: patientId, registration_required: patientId === null })
    .select("token, expires_at")
    .single();

  if (error) {
    if (error.message.includes("LICENSE_INACTIVE"))
      return doctorApiError("La licencia está vencida o suspendida. Contacta al propietario.", "WRITE_FAILED", 403);
    logSupabaseFailure("evaluation-links:create", error);
    return doctorApiError("No se pudo generar el enlace.", "WRITE_FAILED", 500);
  }

  return Response.json(data);
}
