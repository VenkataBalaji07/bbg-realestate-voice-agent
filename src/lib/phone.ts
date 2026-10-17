/** Normalize an Indian phone number. Returns +91XXXXXXXXXX or null when invalid. */
export function normalizePhone(raw: string | number | undefined | null): string | null {
  if (raw === undefined || raw === null) return null;
  let d = String(raw).replace(/[^\d+]/g, "");
  if (!d) return null;
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length !== 10) return null;
  if (!/^[6-9]\d{9}$/.test(d)) return null;
  return `+91${d}`;
}

export function formatPhone(p: string): string {
  const m = p.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : p;
}
