import type { Priority, ProjectStatus, TaskStatus } from "@prisma/client";

/** Shared shell for status and priority chips (projekter list, oversigt, etc.). */
export const BADGE_CHIP_CLASS =
  "inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-semibold leading-tight";

export function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

export function taskProgress(tasks: { status: TaskStatus }[]): number | null {
  if (!tasks.length) return null;
  const done = tasks.filter((t) => t.status === "DONE").length;
  return Math.round((done / tasks.length) * 100);
}

export function statusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "bg-[#f3f4f6] text-[#6b7280]";
    case "IN_PROGRESS":
      return "bg-[#dbeafe] text-[#1e40af]";
    case "WAITING":
      return "bg-[#fef9c3] text-[#854d0e]";
    case "COMPLETED":
      return "bg-[#dcfce7] text-[#15803d]";
    default:
      return "bg-[#f3f4f6] text-[#6b7280]";
  }
}

export function statusLabelDa(status: ProjectStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "Ikke startet";
    case "IN_PROGRESS":
      return "I gang";
    case "WAITING":
      return "Afventer";
    case "COMPLETED":
      return "Fuldført";
  }
}

export function priorityBadgeClass(priority: Priority): string {
  switch (priority) {
    case "LOW":
      return "bg-[#dcfce7] text-[#16a34a]";
    case "MEDIUM":
      return "bg-[#fef3c7] text-[#d97706]";
    case "HIGH":
      return "bg-[#fee2e2] text-[#dc2626]";
  }
}

export function priorityLabelDa(priority: Priority): string {
  switch (priority) {
    case "LOW":
      return "Lav";
    case "MEDIUM":
      return "Mellem";
    case "HIGH":
      return "Høj";
  }
}
