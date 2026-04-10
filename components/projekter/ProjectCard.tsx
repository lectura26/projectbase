"use client";

import type { ProjectStatus } from "@prisma/client";
import Link from "next/link";
import type { ProjectListItem } from "@/types/projekter";
import {
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
        <h3 className="min-w-0 flex-1 font-body text-[13px] font-medium text-app-sidebar">
          {project.name}
        </h3>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app-sidebar text-[10px] font-semibold text-white"
          title={project.owner.name}
        >
          {contactInitials(project.owner.name)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(status)}`}
        >
          {statusLabelDa(status)}
        </span>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityBadgeClass(project.priority)}`}
        >
          {priorityLabelDa(project.priority)}
        </span>
        {project.isRoutine ? (
          <span
            className="material-symbols-outlined text-[16px] leading-none text-app-sidebar/70"
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
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
            <span>Fremgang</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary-container">
            <div className="h-full rounded-full bg-[#c8a96e]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}
      {hasContacts ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {project.contacts.map((c) => (
            <span
              key={c.id}
              title={c.name}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary-fixed text-[10px] font-bold text-app-sidebar"
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
      className={`block rounded-lg border border-app-topbar-border bg-surface-container-lowest p-4 transition-opacity hover:opacity-95 ${className}`}
    >
      <ProjectCardBody project={project} />
    </Link>
  );
}
