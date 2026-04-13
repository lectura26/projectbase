/** Carefully chosen palette aligned with the app design system. */
export const PROJECT_COLORS = [
  "#1a3167",
  "#2563eb",
  "#3b82f6",
  "#0ea5e9",
  "#06b6d4",
  "#0891b2",
  "#0d9488",
  "#059669",
  "#16a34a",
  "#65a30d",
  "#ca8a04",
  "#d97706",
  "#ea580c",
  "#dc2626",
  "#e11d48",
  "#db2777",
  "#9333ea",
  "#7c3aed",
  "#6d28d9",
  "#4f46e5",
  "#0f766e",
  "#047857",
  "#166534",
  "#854d0e",
  "#9a3412",
  "#9f1239",
  "#86198f",
  "#4a044e",
  "#1e3a5f",
  "#374151",
] as const;

const SET = new Set(PROJECT_COLORS.map((c) => c.toLowerCase()));

export function isAllowedProjectColor(hex: string): boolean {
  return SET.has(hex.trim().toLowerCase());
}
