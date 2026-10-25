import { requireDoctor } from "@/lib/supabase/doctor-auth";

export async function GET() {
  const auth = await requireDoctor();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase.from("test_licenses")
    .select("status, valid_until").eq("user_id", auth.user.id).maybeSingle();
  if (error) return Response.json({ error: "No se pudo consultar la licencia." }, { status: 503 });
  return Response.json(data ?? { status: "missing", valid_until: null }, { headers: { "Cache-Control": "no-store" } });
}
