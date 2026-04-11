"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ProjectStatus } from "@prisma/client";
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

export type ProjekterQuickFilter = "alle" | "mine" | "hoj_prioritet" | "overskredet";

const SECTION_ORDER: ProjectStatus[] = [
  "IN_PROGRESS",
  "NOT_STARTED",
  "WAITING",
  "COMPLETED",
];

const SECTION_TITLE: Record<ProjectStatus, string> = {
  IN_PROGRESS: "I GANG",
  NOT_STARTED: "IKKE STARTET",
  WAITING: "AFVENTER",
  COMPLETED: "FULDFØRT",
};

function groupByStatus(projects: ProjectListItem[]): Map<ProjectStatus, ProjectListItem[]> {
  const map = new Map<ProjectStatus, ProjectListItem[]>();
  for (const s of SECTION_ORDER) {
    map.set(s, []);
  }
  for (const p of projects) {
    map.get(p.status)!.push(p);
  }
  return map;
}

function ProjectListRow({ project }: { project: ProjectListItem }) {
  const progress = taskProgress(project.tasks);
  const pct = progress ?? 0;
  const deadline = project.deadline ? new Date(project.deadline) : null;
  const now = new Date();
  const isOverdue =
    deadline !== null && deadline < now && project.status !== "COMPLETED";

  return (
    <Link
      href={`/projekter/${project.id}`}
      className="flex h-[52px] min-h-[52px] w-full items-center gap-3 border-b border-[#e8e8e8] px-1 transition-colors hover:bg-[#f8f9fa]"
    >
      <span className="min-w-0 flex-1 truncate font-body text-[14px] font-medium text-[#0f1923]">
        {project.name}
      </span>
      <span
        className={`${BADGE_CHIP_CLASS} shrink-0 whitespace-nowrap ${statusBadgeClass(project.status)}`}
      >
        {statusLabelDa(project.status)}
      </span>
      <span
        className={`${BADGE_CHIP_CLASS} shrink-0 whitespace-nowrap ${priorityBadgeClass(project.priority)}`}
      >
        {priorityLabelDa(project.priority)}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <div className="h-1 w-20 overflow-hidden rounded-[2px] bg-[#e8e8e8]">
          <div
            className="h-full rounded-[2px] bg-[#1a3167]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-9 shrink-0 font-body text-[12px] tabular-nums text-[#6b7280]">
          {progress === null ? "—" : `${pct}%`}
        </span>
      </div>
      <div className="w-[120px] shrink-0 text-right font-body text-[12px]">
        {isOverdue ? (
          <span className="font-medium text-red-600">Overskredet</span>
        ) : deadline ? (
          <span className="text-[#6b7280]">
            {deadline.toLocaleDateString("da-DK", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        ) : (
          <span className="text-[#6b7280]">—</span>
        )}
      </div>
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a3167] text-[11px] font-semibold text-white"
        title={project.owner.name}
      >
        {contactInitials(project.owner.name)}
      </span>
    </Link>
  );
}

export function ProjekterListView({
  projects,
  showCompleted,
  onShowCompleted,
  onNytProjekt,
}: {
  projects: ProjectListItem[];
  showCompleted: boolean;
  onShowCompleted: () => void;
  onNytProjekt: () => void;
}) {
  const completedCount = useMemo(
    () => projects.filter((p) => p.status === "COMPLETED").length,
    [projects],
  );

  const visibleProjects = useMemo(() => {
    if (showCompleted) return projects;
    return projects.filter((p) => p.status !== "COMPLETED");
  }, [projects, showCompleted]);

  const grouped = useMemo(() => groupByStatus(visibleProjects), [visibleProjects]);

  return (
    <div className="w-full min-w-0">
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
        <>
          {visibleProjects.length > 0
            ? SECTION_ORDER.map((status) => {
                const rows = grouped.get(status)!;
                if (rows.length === 0) return null;
                return (
                  <section key={status} className="mb-1">
                    <h3 className="px-1 pb-2 pt-3 font-body text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af]">
                      {SECTION_TITLE[status]} ({rows.length})
                    </h3>
                    <div>
                      {rows.map((project) => (
                        <ProjectListRow key={project.id} project={project} />
                      ))}
                    </div>
                  </section>
                );
              })
            : null}

          {!showCompleted && completedCount > 0 ? (
            <div className={visibleProjects.length > 0 ? "pt-4" : "py-8"}>
              <button
                type="button"
                onClick={onShowCompleted}
                className="font-body text-[13px] font-medium text-[#1a3167] underline decoration-[#1a3167]/30 underline-offset-2 hover:opacity-90"
              >
                Vis fuldførte ({completedCount})
              </button>
            </div>
          ) : null}
        </>
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
      <div className="flex items-start justify-between gap-2">
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
          <span
            className="material-symbols-outlined text-[16px] leading-none text-on-primary-container"
            aria-label="Rutine"
            title="Rutine"
          >
            repeat
          </span>
        ) : null}
      </div>
      {hasDeadline ? (
        <p className="mt-2 text-[11px] text-on-surface-variant/75">
          Frist:{" "}
          {new Date(project.deadline!).toLocaleDateString("da-DK", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
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
