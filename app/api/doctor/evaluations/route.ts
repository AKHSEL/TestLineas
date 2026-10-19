import { doctorApiError, logSupabaseFailure, requireDoctor } from "@/lib/supabase/doctor-auth";

export async function GET() {
  const auth = await requireDoctor();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("evaluations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseFailure("evaluations:list", error);
    return doctorApiError("No se pudieron leer las evaluaciones.", "READ_FAILED", 500);
  }

  return Response.json(data ?? []);
}
