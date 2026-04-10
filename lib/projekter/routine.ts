import type { RoutineInterval } from "@prisma/client";

/** Next project deadline when restarting a routine from a given date. */
export function deadlineFromRoutineInterval(
  interval: RoutineInterval,
  from: Date = new Date(),
): Date {
  const d = new Date(from);
  switch (interval) {
    case "DAILY":
      d.setDate(d.getDate() + 1);
      return d;
    case "WEEKLY":
      d.setDate(d.getDate() + 7);
      return d;
    case "MONTHLY":
    case "CUSTOM":
      d.setMonth(d.getMonth() + 1);
      return d;
    default:
      return d;
  }
}

export function routineIntervalLabel(interval: RoutineInterval): string {
  switch (interval) {
    case "DAILY":
      return "Daglig rutine";
    case "WEEKLY":
      return "Ugentlig rutine";
    case "MONTHLY":
      return "Månedlig rutine";
    case "CUSTOM":
      return "Tilpasset rutine";
    default:
      return "Rutine";
  }
}
