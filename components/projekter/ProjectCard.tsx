"use client";

import type { ReactNode } from "react";
import { Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Priority, ProjectStatus, TaskStatus } from "@prisma/client";
import { formatDanishDate } from "@/lib/datetime/format-danish";
import type { ProjectListItem } from "@/types/projekter";
import {
  BADGE_CHIP_CLASS,
  contactInitials,
  priorityBadgeClass,
  priorityLabelDa,
  statusBadgeClass,
  statusLabelDa,
  taskProgress,
} from "./project-helpers";

function tableStatusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "bg-[#f3f4f6] text-[#6b7280]";
    case "IN_PROGRESS":
      return "bg-[#dbeafe] text-[#1e40af]";
    case "WAITING":
      return "bg-[#fee2e2] text-[#dc2626]";
    case "COMPLETED":
      return "bg-[#dcfce7] text-[#16a34a]";
    default:
      return "bg-[#f3f4f6] text-[#6b7280]";
  }
}

function tableStatusLabelUpper(status: ProjectStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "PLANLAGT";
    case "IN_PROGRESS":
      return "I GANG";
    case "WAITING":
      return "AFVENTER";
    case "COMPLETED":
      return "FÆRDIG";
  }
}

function priorityDotClass(priority: Priority): string {
  switch (priority) {
    case "HIGH":
      return "bg-[#dc2626]";
    case "MEDIUM":
      return "bg-[#d97706]";
    case "LOW":
      return "bg-[#9ca3af]";
  }
}

function progressBarFillClass(status: ProjectStatus, pct: number): string {
  if (status === "WAITING") return "bg-[#dc2626]";
  if (status === "COMPLETED" || pct >= 100) return "bg-[#16a34a]";
  return "bg-[#1a3167]";
}

function listTaskOverdue(t: { status: TaskStatus; deadline: string | null }): boolean {
  if (t.status === "DONE" || !t.deadline) return false;
  const d = new Date(t.deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function projectTaskCountDisplay(project: ProjectListItem): { text: string; className: string } {
  const tasks = project.tasks;
  const total = tasks.length;
  if (total === 0) {
    return { text: "—", className: "text-[#9ca3af]" };
  }
  const completed = tasks.filter((t) => t.status === "DONE").length;
  if (completed === total && total > 0) {
    return { text: `${completed} / ${total}`, className: "text-[#16a34a]" };
  }
  if (tasks.some(listTaskOverdue)) {
    return { text: `${completed} / ${total}`, className: "text-[#dc2626]" };
  }
  return { text: `${completed} / ${total}`, className: "text-[#6b7280]" };
}

const BADGE_TABLE_CLASS =
  "inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase leading-tight tracking-wide";

function ProjectListRow({ project }: { project: ProjectListItem }) {
  const router = useRouter();
  const progress = taskProgress(project.tasks);
  const pct = progress ?? 0;
  const deadline = project.deadline ? new Date(project.deadline) : null;
  const taskCount = projectTaskCountDisplay(project);

  const go = () => router.push(`/projekter/${project.id}`);

  return (
    <tr
      className="cursor-pointer border-b border-[#e8e8e8] bg-white transition-colors last:border-b-0 hover:bg-[#f8f9fa]"
      style={{ borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: project.color }}
      onClick={go}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
    >
      <td className="px-4 py-[14px] align-middle">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate font-body text-[14px] font-medium text-[#0f1923]">
            {project.name}
          </span>
          {project.isRoutine ? (
            <span className="shrink-0 text-[14px] font-medium text-[#6b7280]" title="Rutine" aria-label="Rutine">
              ↻
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-[14px] align-middle">
        <span
          className={`${BADGE_TABLE_CLASS} whitespace-nowrap ${tableStatusBadgeClass(project.status)}`}
        >
          {tableStatusLabelUpper(project.status)}
        </span>
      </td>
      <td className="px-4 py-[14px] align-middle">
        <span className="inline-flex items-center gap-2 font-body text-[13px] text-[#0f1923]">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${priorityDotClass(project.priority)}`}
            aria-hidden
          />
          {priorityLabelDa(project.priority)}
        </span>
      </td>
      <td className="w-[80px] min-w-[80px] max-w-[80px] px-2 py-[14px] align-middle text-center">
        <span
          className={`inline-block font-body text-[12px] tabular-nums ${taskCount.className}`}
        >
          {taskCount.text}
        </span>
      </td>
      <td className="px-4 py-[14px] align-middle">
        <span className="whitespace-nowrap font-body text-[12px] text-[#6b7280]">
          {deadline ? formatDanishDate(deadline) : "—"}
        </span>
      </td>
      <td className="px-4 py-[14px] align-middle">
        <div className="flex w-[140px] max-w-full items-center justify-end gap-2">
          <div className="h-[4px] w-[120px] shrink-0 overflow-hidden rounded-[2px] bg-[#e8e8e8]">
            <div
              className={`h-full rounded-[2px] ${progressBarFillClass(project.status, pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="w-9 shrink-0 text-right font-body text-[12px] tabular-nums text-[#6b7280]">
            {progress === null ? "—" : `${pct}%`}
          </span>
        </div>
      </td>
      <td className="px-4 py-[14px] align-middle text-right">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1a3167] text-[11px] font-semibold text-white"
          title={project.owner.name}
        >
          {contactInitials(project.owner.name)}
        </span>
      </td>
    </tr>
  );
}

function CompletedProjectListRow({ project }: { project: ProjectListItem }) {
  const router = useRouter();
  const progress = taskProgress(project.tasks);
  const pct = progress ?? 0;
  const deadline = project.deadline ? new Date(project.deadline) : null;
  const taskCount = projectTaskCountDisplay(project);

  const go = () => router.push(`/projekter/${project.id}`);

  return (
    <tr
      className="cursor-pointer border-b border-[#e8e8e8] bg-white opacity-80 transition-colors last:border-b-0 hover:bg-[#f8f9fa]"
      style={{ borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: project.color }}
      onClick={go}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
    >
      <td className="px-4 py-[14px] align-middle">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate font-body text-[14px] font-medium text-[#9ca3af]">
            {project.name}
          </span>
          {project.isRoutine ? (
            <span className="shrink-0 text-[14px] font-medium text-[#9ca3af]" title="Rutine" aria-label="Rutine">
              ↻
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-[14px] align-middle">
        <span
          className={`${BADGE_TABLE_CLASS} whitespace-nowrap bg-[#dcfce7] text-[#16a34a]`}
        >
          FULDFØRT
        </span>
      </td>
      <td className="px-4 py-[14px] align-middle">
        <span className="inline-flex items-center gap-2 font-body text-[13px] text-[#9ca3af]">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${priorityDotClass(project.priority)}`}
            aria-hidden
          />
          {priorityLabelDa(project.priority)}
        </span>
      </td>
      <td className="w-[80px] min-w-[80px] max-w-[80px] px-2 py-[14px] align-middle text-center">
        <span
          className={`inline-block font-body text-[12px] tabular-nums ${taskCount.className}`}
        >
          {taskCount.text}
        </span>
      </td>
      <td className="px-4 py-[14px] align-middle">
        <span className="whitespace-nowrap font-body text-[12px] text-[#9ca3af]">
          {deadline ? formatDanishDate(deadline) : "—"}
        </span>
      </td>
      <td className="px-4 py-[14px] align-middle">
        <div className="flex w-[140px] max-w-full items-center justify-end gap-2">
          <div className="h-[4px] w-[120px] shrink-0 overflow-hidden rounded-[2px] bg-[#e8e8e8]">
            <div
              className={`h-full rounded-[2px] ${progressBarFillClass(project.status, pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="w-9 shrink-0 text-right font-body text-[12px] tabular-nums text-[#9ca3af]">
            {progress === null ? "—" : `${pct}%`}
          </span>
        </div>
      </td>
      <td className="px-4 py-[14px] align-middle text-right">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1a3167] text-[11px] font-semibold text-white opacity-90"
          title={project.owner.name}
        >
          {contactInitials(project.owner.name)}
        </span>
      </td>
    </tr>
  );
}

/** Completed projects table — same columns as active list, muted styling. */
export function ProjekterCompletedListView({ projects }: { projects: ProjectListItem[] }) {
  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-[800px] table-fixed border-collapse">
        <thead className="bg-[#f8f9fa]">
          <tr className="border-b border-[#e8e8e8]">
            <th className="w-[26%] px-4 py-[10px] text-left font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
              Projekt navn
            </th>
            <th className="w-[12%] px-4 py-[10px] text-left font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
              Status
            </th>
            <th className="w-[12%] px-4 py-[10px] text-left font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
              Prioritet
            </th>
            <th className="w-[80px] px-2 py-[10px] text-center font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
              OPGAVER
            </th>
            <th className="w-[12%] px-4 py-[10px] text-left font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
              Frist
            </th>
            <th className="w-[20%] px-4 py-[10px] text-left font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
              Fremdrift
            </th>
            <th className="w-[8%] px-4 py-[10px] text-right font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
              Ejer
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <CompletedProjectListRow key={project.id} project={project} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type ProjekterSortColumn = "name" | "status" | "priority" | "deadline" | "progress";

function SortableTh({
  column,
  children,
  className,
  align = "left",
  onSort,
}: {
  column: ProjekterSortColumn;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
  onSort?: (column: ProjekterSortColumn) => void;
}) {
  const base =
    "font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]";
  if (!onSort) {
    return (
      <th className={className}>
        <span className={base}>{children}</span>
      </th>
    );
  }
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`${base} w-full cursor-pointer border-0 bg-transparent p-0 ${align === "right" ? "text-right" : "text-left"}`}
      >
        {children}
      </button>
    </th>
  );
}

export function ProjekterListView({
  projects,
  onNytProjekt,
  onSortColumn,
}: {
  projects: ProjectListItem[];
  onNytProjekt: () => void;
  onSortColumn?: (column: ProjekterSortColumn) => void;
}) {
  return (
    <div className="w-full min-w-0 overflow-x-auto">
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-body text-sm text-[#6b7280]">Ingen projekter matcher filteret.</p>
          <button
            type="button"
            onClick={onNytProjekt}
            className="mt-3 font-body text-sm font-medium text-[#1a3167] underline decoration-[#1a3167]/30 underline-offset-2 hover:opacity-90"
          >
            + Nyt projekt
          </button>
        </div>
      ) : (
        <table className="w-full min-w-[800px] table-fixed border-collapse">
          <thead className="bg-[#f8f9fa]">
            <tr className="border-b border-[#e8e8e8]">
              <SortableTh
                column="name"
                onSort={onSortColumn}
                className="w-[26%] px-4 py-[10px] text-left"
              >
                Projekt navn
              </SortableTh>
              <SortableTh
                column="status"
                onSort={onSortColumn}
                className="w-[12%] px-4 py-[10px] text-left"
              >
                Status
              </SortableTh>
              <SortableTh
                column="priority"
                onSort={onSortColumn}
                className="w-[12%] px-4 py-[10px] text-left"
              >
                Prioritet
              </SortableTh>
              <th className="w-[80px] px-2 py-[10px] text-center font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                OPGAVER
              </th>
              <SortableTh
                column="deadline"
                onSort={onSortColumn}
                className="w-[12%] px-4 py-[10px] text-left"
              >
                Frist
              </SortableTh>
              <SortableTh
                column="progress"
                onSort={onSortColumn}
                className="w-[20%] px-4 py-[10px] text-left"
              >
                Fremdrift
              </SortableTh>
              <th className="w-[8%] px-4 py-[10px] text-right font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                Ejer
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <ProjectListRow key={project.id} project={project} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function ProjectCardBody({
  project,
  statusColumn,
}: {
  project: ProjectListItem;
  statusColumn?: ProjectStatus;
}) {
  const status = statusColumn ?? project.status;
  const progress = taskProgress(project.tasks);
  const hasContacts = project.contacts.length > 0;
  const hasDeadline = project.deadline != null;

  return (
    <>
      <div
        className="flex items-start justify-between gap-2 border-l-[3px] pl-3"
        style={{ borderLeftColor: project.color }}
      >
        <h3 className="min-w-0 flex-1 font-body text-[13px] font-semibold text-primary">
          {project.name}
        </h3>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container text-[10px] font-semibold text-on-primary"
          title={project.owner.name}
        >
          {contactInitials(project.owner.name)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`${BADGE_CHIP_CLASS} ${statusBadgeClass(status)}`}>
          {statusLabelDa(status)}
        </span>
        <span className={`${BADGE_CHIP_CLASS} ${priorityBadgeClass(project.priority)}`}>
          {priorityLabelDa(project.priority)}
        </span>
        {project.isRoutine ? (
          <span title="Rutine">
            <Repeat
              className="h-4 w-4 text-on-primary-container"
              aria-label="Rutine"
            />
          </span>
        ) : null}
      </div>
      {hasDeadline ? (
        <p className="mt-2 text-[11px] text-on-surface-variant/75">
          Frist:{" "}
          {formatDanishDate(project.deadline!)}
        </p>
      ) : null}
      {progress !== null ? (
        <div className="mt-3 pb-4 pl-[20px] pr-[20px]">
          <div className="h-1.5 w-full overflow-hidden rounded-[4px] bg-surface-container-highest">
            <div className="h-full rounded-[4px] bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}
      {hasContacts ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {project.contacts.map((c) => (
            <span
              key={c.id}
              title={c.name}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-high text-[10px] font-bold text-primary-container"
            >
              {contactInitials(c.name)}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
