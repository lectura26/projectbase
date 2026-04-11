/** Max upload size (10 MB). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXT = new Set(["pdf", "docx", "xlsx", "png", "jpg", "jpeg"]);

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

export function extensionFromFilename(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i + 1).toLowerCase();
}

export function validateUploadFile(file: {
  size: number;
  name: string;
  type: string;
}): { ok: true; ext: string } | { ok: false; reason: string } {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: "Filen er for stor (maks. 10 MB)." };
  }
  if (file.size <= 0) {
    return { ok: false, reason: "Tom fil." };
  }

  const extFromName = extensionFromFilename(file.name);
  if (extFromName && ALLOWED_EXT.has(extFromName)) {
    return { ok: true, ext: extFromName === "jpeg" ? "jpg" : extFromName };
  }

  const fromMime = MIME_TO_EXT[file.type];
  if (fromMime && ALLOWED_EXT.has(fromMime)) {
    return { ok: true, ext: fromMime === "jpeg" ? "jpg" : fromMime };
  }

  return {
    ok: false,
    reason: "Filtype ikke tilladt. Brug PDF, Word, Excel eller billede (PNG/JPEG).",
  };
}

export function sanitizeOriginalFilename(name: string): string {
  return name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 200);
}
