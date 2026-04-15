/** Max upload size (10 MB). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "message/rfc822",
  "text/calendar",
  "application/zip",
  "application/x-zip-compressed",
] as const;

export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".eml",
  ".ics",
  ".zip",
] as const;

const EXT_NO_DOT = new Set(
  ALLOWED_EXTENSIONS.map((e) => e.slice(1).toLowerCase()),
);

/** MIME → storage extension (no dot). */
const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "message/rfc822": "eml",
  "text/calendar": "ics",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

/** Storage extension (no dot) → MIME for uploads / DB when client omits type. */
const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  eml: "message/rfc822",
  ics: "text/calendar",
  zip: "application/zip",
};

function canonicalStorageExt(extNoDot: string): string {
  const e = extNoDot.toLowerCase();
  if (e === "jpeg") return "jpg";
  return e;
}

export function extensionFromFilename(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i + 1).toLowerCase();
}

export function mimeFromExt(extNoDot: string): string {
  const key = canonicalStorageExt(extNoDot);
  return EXT_TO_MIME[key] ?? "application/octet-stream";
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
  if (extFromName && EXT_NO_DOT.has(extFromName)) {
    return { ok: true, ext: canonicalStorageExt(extFromName) };
  }

  const fromMime = MIME_TO_EXT[file.type];
  if (fromMime) {
    return { ok: true, ext: canonicalStorageExt(fromMime) };
  }

  return {
    ok: false,
    reason:
      "Filtype ikke tilladt. Brug PDF, Office, tekst, CSV, billeder, e-mail, kalender eller ZIP.",
  };
}

export function sanitizeOriginalFilename(name: string): string {
  return name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 200);
}
