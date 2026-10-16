import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseFailure = {
  name?: string;
  status?: number;
  code?: string;
  message?: string;
  hint?: string;
};

export type DoctorApiErrorCode =
  | "UNAUTHORIZED"
  | "AUTH_UNAVAILABLE"
  | "READ_FAILED"
  | "WRITE_FAILED"
  | "DUPLICATE_PATIENT"
  | "NOT_FOUND";

export function logSupabaseFailure(scope: string, error: SupabaseFailure) {
  console.error(`[supabase:${scope}]`, {
    name: error.name,
    status: error.status,
    code: error.code,
    message: error.message,
    hint: error.hint,
  });
}

export function doctorApiError(error: string, code: DoctorApiErrorCode, status: number) {
  return Response.json({ error, code }, { status });
}

export async function requireDoctor() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false as const,
      response: doctorApiError(
        "El servicio de autenticación no está configurado.",
        "AUTH_UNAVAILABLE",
        503,
      ),
    };
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    const isUnauthorized =
      error.status === 401 ||
      error.name === "AuthSessionMissingError" ||
      error.name === "AuthInvalidJwtError";
    if (!isUnauthorized) logSupabaseFailure("doctor-auth", error);

    return {
      ok: false as const,
      response: isUnauthorized
        ? doctorApiError("La sesión no es válida o ha expirado.", "UNAUTHORIZED", 401)
        : doctorApiError("No se pudo validar la sesión con Supabase.", "AUTH_UNAVAILABLE", 503),
    };
  }

  if (!user) {
    return {
      ok: false as const,
      response: doctorApiError("Debes iniciar sesión.", "UNAUTHORIZED", 401),
    };
  }

  return { ok: true as const, supabase, user };
}
