import { doctorApiError, logSupabaseFailure, requireActiveDoctor, requireDoctor } from "@/lib/supabase/doctor-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDoctor();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from("evaluations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    logSupabaseFailure("evaluations:detail", error);
    if (error.code === "PGRST116") {
      return doctorApiError("Evaluación no encontrada.", "NOT_FOUND", 404);
    }
    return doctorApiError("No se pudo leer la evaluación.", "READ_FAILED", 500);
  }

  return Response.json(data);
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/doctor/evaluations/[id]">) {
  const auth = await requireActiveDoctor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => null) as { patientId?: unknown } | null;
  if (typeof body?.patientId !== "string") {
    return doctorApiError("Selecciona un paciente válido.", "WRITE_FAILED", 400);
  }

  const { error } = await auth.supabase.rpc("assign_evaluation_to_patient", {
    p_evaluation_id: id,
    p_patient_id: body.patientId,
  });
  if (error) {
    logSupabaseFailure("evaluations:assign", error);
    const invalid = error.message.includes("ASSIGNMENT_INVALID");
    return doctorApiError(
      invalid ? "La evaluación ya fue asignada o el paciente no es válido." : "No se pudo asignar la evaluación.",
      invalid ? "NOT_FOUND" : "WRITE_FAILED",
      invalid ? 409 : 500,
    );
  }
  return Response.json({ ok: true });
}
