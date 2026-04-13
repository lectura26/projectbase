/** Calendar date as YYYY-MM-DD using UTC date parts (stable for stored ISO timestamps). */
export function isoToYmd(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Strict YYYY-MM-DD → ISO string for Prisma, or null if empty/invalid. */
export function ymdToIsoDate(ymd: string | null | undefined): string | null {
  const t = (ymd ?? "").trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1000 || y > 9999) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt.toISOString();
}

/** Display like "12. Apr, 2026" (English short month, UTC). */
export function formatProjectHeaderDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getUTCDate();
  const month = d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  const year = d.getUTCFullYear();
  return `${day}. ${month}, ${year}`;
}

const DIGIT_MAX = 8;

/** While typing: only digits, max 8, format as YYYY-MM-DD. */
export function normalizePartialYmd(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, DIGIT_MAX);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** On blur: return valid yyyy-MM-dd or "". */
/** For Prisma DateTime fields from form YMD strings. */
export function ymdStringToDateOrNull(s: string | null | undefined): Date | null {
  const iso = ymdToIsoDate(s ?? "");
  return iso ? new Date(iso) : null;
}

export function commitYmdString(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return "";
  }
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
