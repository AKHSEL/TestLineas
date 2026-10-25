import { requireDoctor } from "@/lib/supabase/doctor-auth";
import { isLicenseReadOnly, type TestLicense } from "@/lib/license";

export async function GET() {
  const auth = await requireDoctor();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase.from("test_licenses")
    .select("status, valid_until").eq("user_id", auth.user.id).maybeSingle();
  if (error) return Response.json({ error: "No se pudo consultar la licencia." }, { status: 503 });
  const license = (data ?? { status: "missing", valid_until: null }) as TestLicense;
  return Response.json({ ...license, read_only: isLicenseReadOnly(license) }, { headers: { "Cache-Control": "no-store" } });
}
