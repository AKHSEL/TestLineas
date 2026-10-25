import { doctorApiError, logSupabaseFailure, requireActiveDoctor, requireDoctor } from "@/lib/supabase/doctor-auth";
import { parsePatientInput } from "@/lib/patients";

export async function GET() {
  const auth = await requireDoctor();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("patients")
    .select("id, nombre, apellido, document_type, document_number, created_at, updated_at, evaluations(id, created_at)")
    .order("apellido", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) {
    logSupabaseFailure("patients:list", error);
    return doctorApiError("No se pudieron leer los pacientes.", "READ_FAILED", 500);
  }

  return Response.json((data ?? []).map((patient) => {
    const evaluations = [...(patient.evaluations ?? [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return {
      id: patient.id,
      nombre: patient.nombre,
      apellido: patient.apellido,
      document_type: patient.document_type,
      document_number: patient.document_number,
      created_at: patient.created_at,
      updated_at: patient.updated_at,
      evaluation_count: evaluations.length,
      last_evaluation_at: evaluations[0]?.created_at ?? null,
    };
  }));
}

export async function POST(request: Request) {
  const auth = await requireActiveDoctor();
  if (!auth.ok) return auth.response;

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
      .maybeSingle();
    if (lookupError) {
      logSupabaseFailure("patients:duplicate-check", lookupError);
      return doctorApiError("No se pudo validar el documento.", "READ_FAILED", 500);
    }
    if (existing) {
      return Response.json(
        { error: "Ya existe una ficha con este documento.", code: "DUPLICATE_PATIENT", patient_id: existing.id },
        { status: 409 },
      );
    }
  }

  const { data, error } = await auth.supabase
    .from("patients")
    .insert({
      doctor_id: auth.user.id,
      nombre: patientInput.nombre,
      apellido: patientInput.apellido,
      document_type: patientInput.documentType,
      document_number: patientInput.documentNumber,
    })
    .select("id, nombre, apellido, document_type, document_number, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505" && patientInput.documentNumber) {
      const { data: existing } = await auth.supabase
        .from("patients")
        .select("id")
        .eq("document_type", patientInput.documentType)
        .eq("document_number", patientInput.documentNumber)
        .maybeSingle();
      return Response.json(
        { error: "Ya existe una ficha con este documento.", code: "DUPLICATE_PATIENT", patient_id: existing?.id },
        { status: 409 },
      );
    }
    logSupabaseFailure("patients:create", error);
    return doctorApiError("No se pudo crear la ficha del paciente.", "WRITE_FAILED", 500);
  }

  return Response.json({ ...data, evaluation_count: 0, last_evaluation_at: null }, { status: 201 });
}
