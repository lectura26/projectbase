"use client";

import type { ProjectStatus } from "@prisma/client";
import Link from "next/link";
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

export function ProjectCardBody({
  project,
  statusColumn,
}: {
  project: ProjectListItem;
  /** Kanban column status (for consistent badge while dragging). */
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

export function ProjectCard({ project, className = "" }: { project: ProjectListItem; className?: string }) {
  return (
    <Link
      href={`/projekter/${project.id}`}
      className={`block rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-[20px] shadow-sm ring-1 ring-black/5 transition-colors hover:bg-surface-container-low/50 ${className}`}
    >
      <ProjectCardBody project={project} />
    </Link>
  );
}
