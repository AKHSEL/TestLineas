import { createSupabasePublicClient } from "@/lib/supabase/public";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let token: unknown;
  try {
    ({ token } = await request.json());
  } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (typeof token !== "string" || !UUID_PATTERN.test(token)) {
    return Response.json({ error: "El enlace no es válido." }, { status: 400 });
  }

  const supabase = createSupabasePublicClient();
  if (!supabase) return Response.json({ error: "Supabase no está configurado." }, { status: 503 });

  const { data, error } = await supabase.rpc("record_test_consent", { p_token: token });
  if (error) {
    return Response.json({ error: error.message.includes("LINK_INVALID")
      ? "El enlace venció o ya fue utilizado."
      : "No se pudo registrar el consentimiento. Intenta nuevamente." }, { status: error.message.includes("LINK_INVALID") ? 404 : 503 });
  }

  return Response.json({ consentStartedAt: data });
}
