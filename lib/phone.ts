export function normalizeIndianPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const compact = value.trim().replace(/[\s()\-]/g, "");
  if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`;
  if (/^91[6-9]\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\+91[6-9]\d{9}$/.test(compact)) return compact;
  return null;
}
