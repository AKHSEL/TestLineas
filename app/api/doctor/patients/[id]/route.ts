import { doctorApiError, logSupabaseFailure, requireActiveDoctor, requireDoctor } from "@/lib/supabase/doctor-auth";
import { parsePatientInput } from "@/lib/patients";

export async function GET(_request: Request, { params }: RouteContext<"/api/doctor/patients/[id]">) {
  const auth = await requireDoctor();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const [patientResult, evaluationsResult] = await Promise.all([
    auth.supabase.from("patients").select("id, nombre, apellido, document_type, document_number, created_at, updated_at").eq("id", id).single(),
    auth.supabase.from("evaluations").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
  ]);

  if (patientResult.error) {
    logSupabaseFailure("patients:detail", patientResult.error);
    if (patientResult.error.code === "PGRST116") {
      return doctorApiError("Paciente no encontrado.", "NOT_FOUND", 404);
    }
    return doctorApiError("No se pudo leer la ficha del paciente.", "READ_FAILED", 500);
  }
  if (evaluationsResult.error) {
    logSupabaseFailure("patients:evaluations", evaluationsResult.error);
    return doctorApiError("No se pudo leer la evolución del paciente.", "READ_FAILED", 500);
  }

  return Response.json({ ...patientResult.data, evaluations: evaluationsResult.data ?? [] });
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/doctor/patients/[id]">) {
  const auth = await requireActiveDoctor();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => null) as {
    nombre?: unknown;
    apellido?: unknown;
    document_type?: unknown;
    document_number?: unknown;
  } | null;
  const patientInput = parsePatientInput(body);
  if (!patientInput.ok) return doctorApiError(patientInput.error, "WRITE_FAILED", 400);

  if (patientInput.documentNumber) {
    const { data: existing, error: lookupError } = await auth.supabase
      .from("patients")
      .select("id")
      .eq("document_type", patientInput.documentType)
      .eq("document_number", patientInput.documentNumber)
      .neq("id", id)
      .maybeSingle();
    if (lookupError) {
      logSupabaseFailure("patients:update-duplicate-check", lookupError);
      return doctorApiError("No se pudo validar el documento.", "READ_FAILED", 500);
    }
    if (existing) {
      return Response.json(
        { error: "Ya existe otra ficha con este documento.", code: "DUPLICATE_PATIENT", patient_id: existing.id },
        { status: 409 },
      );
    }
  }

  const { data, error } = await auth.supabase
    .from("patients")
    .update({
      nombre: patientInput.nombre,
      apellido: patientInput.apellido,
      document_type: patientInput.documentType,
      document_number: patientInput.documentNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, nombre, apellido, document_type, document_number, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505" && patientInput.documentNumber) {
      const { data: existing } = await auth.supabase
        .from("patients")
        .select("id")
        .eq("document_type", patientInput.documentType)
        .eq("document_number", patientInput.documentNumber)
        .neq("id", id)
        .maybeSingle();
      return Response.json(
        { error: "Ya existe otra ficha con este documento.", code: "DUPLICATE_PATIENT", patient_id: existing?.id },
        { status: 409 },
      );
    }
    logSupabaseFailure("patients:update", error);
    if (error.code === "PGRST116") return doctorApiError("Paciente no encontrado.", "NOT_FOUND", 404);
    return doctorApiError("No se pudo actualizar la ficha.", "WRITE_FAILED", 500);
  }
  return Response.json(data);
}
