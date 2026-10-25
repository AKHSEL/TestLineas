export type TestLicense = {
  status: "active" | "suspended" | "missing";
  valid_until: string | null;
};

export function isLicenseReadOnly(license: TestLicense | null): boolean {
  if (!license || license.status !== "active") return true;
  const todayInPeru = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return license.valid_until !== null && license.valid_until < todayInPeru;
}
