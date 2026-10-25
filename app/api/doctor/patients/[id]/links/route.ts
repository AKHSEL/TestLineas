import { doctorApiError, logSupabaseFailure, requireActiveDoctor } from "@/lib/supabase/doctor-auth";

export async function POST(_request: Request, { params }: RouteContext<"/api/doctor/patients/[id]/links">) {
  const auth = await requireActiveDoctor();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const { data: patient, error: patientError } = await auth.supabase
    .from("patients")
    .select("id")
    .eq("id", id)
    .single();
  if (patientError || !patient) {
    if (patientError) logSupabaseFailure("patient-links:patient", patientError);
    return doctorApiError("Paciente no encontrado.", "NOT_FOUND", 404);
  }

  const { data, error } = await auth.supabase
    .from("evaluation_links")
    .insert({ doctor_id: auth.user.id, patient_id: patient.id })
    .select("token, expires_at")
    .single();
  if (error) {
    if (error.message.includes("LICENSE_INACTIVE"))
      return doctorApiError("La licencia está vencida o suspendida. Contacta al propietario.", "WRITE_FAILED", 403);
    logSupabaseFailure("patient-links:create", error);
    return doctorApiError("No se pudo generar el enlace.", "WRITE_FAILED", 500);
  }
  return Response.json(data, { status: 201 });
}
