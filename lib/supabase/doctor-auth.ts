import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isLicenseReadOnly, type TestLicense } from "@/lib/license";

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
  | "LICENSE_READ_ONLY"
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

export async function requireActiveDoctor() {
  const auth = await requireDoctor();
  if (!auth.ok) return auth;
  const { data, error } = await auth.supabase.from("test_licenses")
    .select("status, valid_until").eq("user_id", auth.user.id).maybeSingle();
  if (error) return {
    ok: false as const,
    response: doctorApiError("No se pudo validar la licencia.", "AUTH_UNAVAILABLE", 503),
  };
  if (isLicenseReadOnly(data as TestLicense | null)) return {
    ok: false as const,
    response: doctorApiError("La licencia está en modo solo lectura. Puedes ver y exportar los informes existentes.", "LICENSE_READ_ONLY", 403),
  };
  return auth;
}
