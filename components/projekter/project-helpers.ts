import type { Priority, ProjectStatus } from "@prisma/client";
import type { ProjectListItem } from "@/types/projekter";

export function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

export function taskProgress(tasks: ProjectListItem["tasks"]): number | null {
  if (!tasks.length) return null;
  const done = tasks.filter((t) => t.status === "DONE").length;
  return Math.round((done / tasks.length) * 100);
}

/** Compact neutral status chips (Stitch Projectbase 2 projekter list). */
export function statusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "bg-surface-container-highest text-on-surface-variant";
    case "IN_PROGRESS":
      return "bg-secondary-container text-on-secondary-container";
    case "WAITING":
      return "bg-surface-container-high text-on-surface-variant";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-surface-container-highest text-on-surface-variant";
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

/** Compact neutral priority chips. */
export function priorityBadgeClass(priority: Priority): string {
  switch (priority) {
    case "LOW":
      return "bg-surface-container-high text-on-surface-variant";
    case "MEDIUM":
      return "bg-surface-container-high text-on-surface-variant";
    case "HIGH":
      return "bg-error-container/80 text-on-error-container";
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
