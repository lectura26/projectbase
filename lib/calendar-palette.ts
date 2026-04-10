/** Six navy-toned colors for calendar project pills (stable per project id). */
export const CALENDAR_PROJECT_PALETTE = [
  "#0f1f45",
  "#1a3167",
  "#243e7a",
  "#2f4c8f",
  "#3a5aa3",
  "#4a68b8",
] as const;

export function projectColorForId(projectId: string): string {
  let h = 0;
  for (let i = 0; i < projectId.length; i++) {
    h = Math.imul(31, h) + projectId.charCodeAt(i);
  }
  const idx = Math.abs(h) % CALENDAR_PROJECT_PALETTE.length;
  return CALENDAR_PROJECT_PALETTE[idx];
}
