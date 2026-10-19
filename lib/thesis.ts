export type ThesisTimes = {
  consentStartedAt: string | null;
  confirmedAt: string | null;
  resultAvailableAt: string | null;
  totalProcessSeconds: number | null;
  processingSeconds: number | null;
};

export type ThesisRow = ThesisTimes & {
  patientId: string;
  patientName: string;
  evaluationId: string | null;
};

function validTimestamp(value: unknown): string | null {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

function elapsedSeconds(from: string | null, to: string | null, preserveMilliseconds = false): number | null {
  if (!from || !to) return null;
  const difference = Date.parse(to) - Date.parse(from);
  return difference >= 0 ? (preserveMilliseconds ? difference / 1000 : Math.round(difference / 1000)) : null;
}

export function getThesisTimes(result: unknown, createdAt: unknown): ThesisTimes {
  const stored = result && typeof result === "object" && "thesis" in result
    ? (result as { thesis?: unknown }).thesis
    : null;
  const thesis = stored && typeof stored === "object" ? stored as Record<string, unknown> : null;
  const consentStartedAt = validTimestamp(thesis?.consentStartedAt);
  const confirmedAt = validTimestamp(thesis?.confirmedAt);
  const resultAvailableAt = validTimestamp(createdAt);

  return {
    consentStartedAt,
    confirmedAt,
    resultAvailableAt,
    totalProcessSeconds: elapsedSeconds(consentStartedAt, resultAvailableAt),
    processingSeconds: elapsedSeconds(confirmedAt, resultAvailableAt, true),
  };
}

const limaFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function formatThesisMoment(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  const parts = Object.fromEntries(limaFormatter.formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]));
  return `${parts.hour}:${parts.minute}:${parts.second}`;
}

export function formatThesisSeconds(seconds: number | null, decimals = 0): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "";
  const formatted = new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(seconds);
  return `${formatted} ${seconds === 1 ? "segundo" : "segundos"}`;
}

export function formatThesisProcessing(times: ThesisTimes): string {
  if (times.processingSeconds !== null) return formatThesisSeconds(times.processingSeconds, 3);
  if (times.confirmedAt && times.resultAvailableAt && Date.parse(times.confirmedAt) > Date.parse(times.resultAvailableAt)) {
    return "Horas inconsistentes";
  }
  return "";
}
