import { parsePatientInput } from "@/lib/patients";
import { createSupabasePublicClient } from "@/lib/supabase/public";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    token?: unknown;
    nombre?: unknown;
    apellido?: unknown;
    document_type?: unknown;
    document_number?: unknown;
  } | null;
  if (typeof body?.token !== "string" || !UUID_PATTERN.test(body.token)) {
    return Response.json({ error: "El enlace no es válido." }, { status: 400 });
  }
  const patient = parsePatientInput(body);
  if (!patient.ok || !patient.documentType || !patient.documentNumber) {
    return Response.json({ error: patient.ok ? "Ingresa tu documento." : patient.error }, { status: 400 });
  }

  const supabase = createSupabasePublicClient();
  if (!supabase) return Response.json({ error: "Supabase no está configurado." }, { status: 503 });
  const { error } = await supabase.rpc("register_invited_patient", {
    p_token: body.token,
    p_nombre: patient.nombre,
    p_apellido: patient.apellido,
    p_document_type: patient.documentType,
    p_document_number: patient.documentNumber,
  });
  if (error) {
    if (error.message.includes("DOCUMENT_EXISTS")) {
      return Response.json({ error: "No se pudo registrar este documento. Contacta al profesional para recibir un enlace desde tu ficha." }, { status: 409 });
    }
    if (error.message.includes("LINK_INVALID") || error.message.includes("CONSENT_REQUIRED")) {
      return Response.json({ error: "El enlace o el consentimiento ya no está disponible." }, { status: 400 });
    }
    if (error.message.includes("PATIENT_INVALID")) {
      return Response.json({ error: "Revisa tus datos personales y tu documento." }, { status: 400 });
    }
    console.error("[test:register]", { code: error.code, message: error.message });
    return Response.json({ error: "No se pudo crear la ficha. Intenta de nuevo." }, { status: 500 });
  }
  return Response.json({ ok: true }, { status: 201 });
}
