/** Escape text for safe insertion into HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function plainTextToTipTapHtml(plain: string): string {
  const t = plain.trim();
  if (!t) return "<p></p>";
  return `<p>${escapeHtml(t).replace(/\n/g, "<br>")}</p>`;
}

/** Load: HTML if it looks like markup, otherwise plain → paragraph. */
export function initialContentFromNote(raw: string): string {
  const t = raw.trim();
  if (!t) return "<p></p>";
  if (t.startsWith("<")) return t;
  return plainTextToTipTapHtml(t);
}

/** Compare notes for dirty check (plain vs HTML with same text counts as equal). */
export function normalizeNoteForCompare(s: string): string {
  const t = s.trim();
  if (!t) return "";
  const html = t.startsWith("<") ? t : plainTextToTipTapHtml(t);
  if (typeof document === "undefined") {
    const plain = html.replace(/<[^>]+>/g, "").trim();
    return plain === "" ? "" : html;
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").trim() === "" ? "" : html;
}

export function notesAreEqual(a: string, b: string): boolean {
  return normalizeNoteForCompare(a) === normalizeNoteForCompare(b);
}

/** Strip tags for changelog / plain display. */
export function stripHtmlForDisplay(html: string): string {
  if (!html.trim()) return "";
  if (!html.trim().startsWith("<")) return html;
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}
