/** Display-only: e.g. "13. apr. 2026" */
export function formatDanishDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** yyyy-MM-dd → DD-MM-YYYY for the date picker text field. */
export function isoYmdToDanishDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? "").trim());
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** DD-MM-YYYY → yyyy-MM-dd (empty if invalid). */
export function danishDisplayToIsoYmd(display: string): string {
  const raw = (display ?? "").trim().replace(/\s/g, "");
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  if (!m) return "";
  const y = Number(m[3]);
  const mo = Number(m[2]);
  const d = Number(m[1]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1000 || y > 9999) return "";
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

/** While typing: digits → DD-MM-YYYY */
export function normalizePartialDanishDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}
