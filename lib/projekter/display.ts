export function displayName(u: { name: string | null; email: string }): string {
  return (u.name?.trim() || u.email).trim() || "?";
}

export function initialsFromUser(u: { name: string | null; email: string }): string {
  return initialsFromString(displayName(u));
}

export function initialsFromString(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (
      (parts[0][0] + parts[parts.length - 1][0])
    ).toUpperCase();
  }
  return label.slice(0, 2).toUpperCase() || "?";
}

const CALENDAR_DOT_COLORS = [
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#db2777",
  "#0d9488",
  "#ea580c",
];

export function projectCalendarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(31, h) + id.charCodeAt(i);
  }
  return CALENDAR_DOT_COLORS[Math.abs(h) % CALENDAR_DOT_COLORS.length];
}
