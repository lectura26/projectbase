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

export function statusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "bg-neutral-200 text-neutral-700";
    case "IN_PROGRESS":
      return "bg-sky-600 text-white";
    case "WAITING":
      return "bg-amber-100 text-amber-900";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-900";
    default:
      return "bg-neutral-200 text-neutral-700";
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
      return "bg-emerald-50 text-emerald-800";
    case "MEDIUM":
      return "bg-amber-50 text-amber-900";
    case "HIGH":
      return "bg-red-50 text-red-800";
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
