export type TestLicense = {
  status: "active" | "suspended" | "missing";
  valid_until: string | null;
};

function todayInPeru(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export function isLicenseReadOnly(license: TestLicense | null): boolean {
  if (!license || license.status !== "active") return true;
  return license.valid_until !== null && license.valid_until < todayInPeru();
}

export function daysUntilLicenseExpiry(license: TestLicense | null): number | null {
  if (!license?.valid_until) return null;
  return Math.round((Date.parse(`${license.valid_until}T00:00:00Z`) - Date.parse(`${todayInPeru()}T00:00:00Z`)) / 86_400_000);
}
