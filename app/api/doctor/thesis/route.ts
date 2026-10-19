import { doctorApiError, logSupabaseFailure, requireDoctor } from "@/lib/supabase/doctor-auth";
import { getThesisTimes, type ThesisRow } from "@/lib/thesis";

type Patient = { id: string; nombre: string; apellido: string };
type Evaluation = { id: string; patient_id: string | null; result: unknown; created_at: string };
const PAGE_SIZE = 1000;

export async function GET() {
  const auth = await requireDoctor();
  if (!auth.ok) return auth.response;

  const patients: Patient[] = [];
  for (let offset = 0; ;) {
    const { data, error, count } = await auth.supabase.from("patients")
      .select("id, nombre, apellido", { count: "exact" })
      .order("apellido").order("nombre").order("id")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      logSupabaseFailure("thesis:patients", error);
      return doctorApiError("No se pudieron leer los pacientes de Tesis.", "READ_FAILED", 500);
    }
    const batch = data ?? [];
    patients.push(...batch);
    offset += batch.length;
    if (batch.length === 0 || (count !== null && offset >= count)) break;
  }

  const evaluations: Evaluation[] = [];
  for (let offset = 0; ;) {
    const { data, error, count } = await auth.supabase.from("evaluations")
      .select("id, patient_id, result, created_at", { count: "exact" })
      .not("patient_id", "is", null)
      .eq("source_type", "online")
      .order("created_at", { ascending: false }).order("id")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      logSupabaseFailure("thesis:evaluations", error);
      return doctorApiError("No se pudieron leer las evaluaciones de Tesis.", "READ_FAILED", 500);
    }
    const batch = data ?? [];
    evaluations.push(...batch);
    offset += batch.length;
    if (batch.length === 0 || (count !== null && offset >= count)) break;
  }

  const byPatient = new Map<string, Evaluation[]>();
  for (const evaluation of evaluations) {
    if (!evaluation.patient_id) continue;
    const group = byPatient.get(evaluation.patient_id) ?? [];
    group.push(evaluation);
    byPatient.set(evaluation.patient_id, group);
  }

  const rows: ThesisRow[] = patients.flatMap<ThesisRow>((patient) => {
    const identity = { patientId: patient.id, patientName: `${patient.apellido}, ${patient.nombre}` };
    const history = byPatient.get(patient.id);
    if (!history?.length) return [];
    return history.map((evaluation) => ({
      ...identity,
      evaluationId: evaluation.id,
      ...getThesisTimes(evaluation.result, evaluation.created_at),
    }));
  });

  return Response.json(rows);
}
