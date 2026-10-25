import { requireLicenseOwner } from "@/lib/supabase/owner-auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const auth = await requireLicenseOwner();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase.rpc("owner_list_licenses");
  if (error) return Response.json({ error: "No se pudieron leer las licencias." }, { status: 503 });
  return Response.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const auth = await requireLicenseOwner();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null) as { userId?: unknown; status?: unknown; validUntil?: unknown; removeExpiry?: unknown } | null;
  const date = body?.validUntil;
  const dateIsValid = date === null ||
    (typeof date === "string" && DATE.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) &&
      new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date);
  if (!body || typeof body.userId !== "string" || !UUID.test(body.userId) ||
      (body.status !== "active" && body.status !== "suspended") || !dateIsValid) {
    return Response.json({ error: "Datos de licencia inválidos." }, { status: 400 });
  }
  if (date === null && body.removeExpiry !== true) {
    const { data: licenses, error: listError } = await auth.supabase.rpc("owner_list_licenses");
    if (listError) return Response.json({ error: "No se pudo verificar la fecha anterior." }, { status: 503 });
    const current = (licenses as { user_id: string; valid_until: string | null }[] | null)?.find(item => item.user_id === body.userId);
    if (current?.valid_until) return Response.json({ error: "Para quitar la fecha usa «Quitar vencimiento» y guarda de nuevo." }, { status: 400 });
  }
  const { error } = await auth.supabase.rpc("owner_set_license", {
    p_user_id: body.userId,
    p_status: body.status,
    p_valid_until: date,
  });
  if (error) return Response.json({ error: "No se pudo guardar la licencia." }, { status: 400 });
  return Response.json({ ok: true });
}
