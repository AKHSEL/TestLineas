import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireLicenseOwner() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false as const, response: Response.json({ error: "Servicio no configurado." }, { status: 503 }) };
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, response: Response.json({ error: "Inicia sesión como propietario." }, { status: 401 }) };
  const { data: isOwner, error: roleError } = await supabase.rpc("is_license_owner");
  if (roleError) return { ok: false as const, response: Response.json({ error: "No se pudo verificar el acceso." }, { status: 503 }) };
  if (!isOwner) return { ok: false as const, response: Response.json({ error: "Acceso reservado al propietario." }, { status: 403 }) };
  return { ok: true as const, supabase };
}
