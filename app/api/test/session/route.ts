import { createSupabasePublicClient } from "@/lib/supabase/public";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || !UUID_PATTERN.test(token)) {
    return Response.json({ error: "El enlace no es válido." }, { status: 400 });
  }

  const supabase = createSupabasePublicClient();
  if (!supabase) return Response.json({ error: "Supabase no está configurado." }, { status: 503 });

  const { data, error } = await supabase.rpc("get_evaluation_session", { p_token: token }).maybeSingle();
  if (error) return Response.json({ error: "No se pudo validar el enlace." }, { status: 503 });
  if (!data) return Response.json({ error: "El enlace venció o ya fue utilizado." }, { status: 404 });
  const session = data as { nombre?: string | null; apellido?: string | null };

  return Response.json({ nombre: session.nombre ?? null, apellido: session.apellido ?? null });
}
