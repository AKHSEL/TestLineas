export const DOCUMENT_TYPES = ["dni", "ce", "passport"] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  dni: "DNI",
  ce: "Carné de extranjería",
  passport: "Pasaporte",
};

type PatientInput = {
  nombre?: unknown;
  apellido?: unknown;
  document_type?: unknown;
  document_number?: unknown;
};

export function parsePatientInput(input: PatientInput | null) {
  const nombre = typeof input?.nombre === "string" ? input.nombre.trim().replace(/\s+/g, " ") : "";
  const apellido = typeof input?.apellido === "string" ? input.apellido.trim().replace(/\s+/g, " ") : "";
  if (!nombre || !apellido || nombre.length > 80 || apellido.length > 80) {
    return { ok: false as const, error: "Ingresa un nombre y apellido válidos." };
  }

  const document = parsePatientDocument(input?.document_type, input?.document_number);
  if (!document.ok) return document;

  return { ok: true as const, nombre, apellido, documentType: document.documentType, documentNumber: document.documentNumber };
}

export function normalizeDocument(value: unknown) {
  return typeof value === "string"
    ? value.toUpperCase().replace(/[^A-Z0-9]/g, "")
    : "";
}

export function parsePatientDocument(typeValue: unknown, numberValue: unknown) {
  const type = typeof typeValue === "string" ? typeValue.toLowerCase() : "";
  const number = normalizeDocument(numberValue);

  if (!number && !type) {
    return { ok: true as const, documentType: null, documentNumber: null };
  }
  if (!DOCUMENT_TYPES.includes(type as DocumentType) || !number) {
    return { ok: false as const, error: "Selecciona el tipo e ingresa el número de documento." };
  }
  if (type === "dni" && !/^\d{8}$/.test(number)) {
    return { ok: false as const, error: "El DNI debe contener exactamente 8 dígitos." };
  }
  if (type !== "dni" && !/^[A-Z0-9]{6,15}$/.test(number)) {
    return { ok: false as const, error: "El documento debe contener entre 6 y 15 letras o números." };
  }

  return {
    ok: true as const,
    documentType: type as DocumentType,
    documentNumber: number,
  };
}

export function maskDocument(value: string | null | undefined) {
  if (!value) return "Sin documento";
  return `••••${value.slice(-4)}`;
}
