"use client";

import type { Priority, ProjectStatus } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectListItem } from "@/types/projekter";
import { NytProjektModal } from "./NytProjektModal";
import {
  ProjekterListView,
  type ProjekterQuickFilter,
} from "./ProjectCard";
import { ProjekterKanban } from "./ProjekterKanban";

type ViewMode = "liste" | "kanban" | "kalender" | "tabel";

type FilterState = {
  ownerId: string;
  status: ProjectStatus | "";
  priority: Priority | "";
  deadlineFrom: string;
  deadlineTo: string;
};

const defaultFilters: FilterState = {
  ownerId: "",
  status: "",
  priority: "",
  deadlineFrom: "",
  deadlineTo: "",
};

function startOfDay(isoDate: string): Date {
  const d = new Date(isoDate + "T00:00:00");
  return d;
}

function endOfDay(isoDate: string): Date {
  const d = new Date(isoDate + "T23:59:59.999");
  return d;
}

function applyFilters(projects: ProjectListItem[], f: FilterState): ProjectListItem[] {
  return projects.filter((p) => {
    if (f.ownerId && p.owner.id !== f.ownerId) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.priority && p.priority !== f.priority) return false;
    if (f.deadlineFrom || f.deadlineTo) {
      if (!p.deadline) return false;
      const d = new Date(p.deadline);
      if (f.deadlineFrom && d < startOfDay(f.deadlineFrom)) return false;
      if (f.deadlineTo && d > endOfDay(f.deadlineTo)) return false;
    }
    return true;
  });
}

function applyQuickFilter(
  projects: ProjectListItem[],
  q: ProjekterQuickFilter,
  currentUserId: string,
): ProjectListItem[] {
  if (q === "alle") return projects;
  const now = new Date();
  switch (q) {
    case "mine":
      return projects.filter((p) => p.owner.id === currentUserId);
    case "hoj_prioritet":
      return projects.filter((p) => p.priority === "HIGH");
    case "overskredet":
      return projects.filter(
        (p) =>
          p.deadline != null &&
          new Date(p.deadline) < now &&
          p.status !== "COMPLETED",
      );
    default:
      return projects;
  }
}

export default function ProjekterPageClient({
  initialProjects,
  ownerOptions,
  usersForCreate,
  currentUserId,
}: {
  initialProjects: ProjectListItem[];
  ownerOptions: { id: string; name: string }[];
  usersForCreate: { id: string; name: string; email: string }[];
  currentUserId: string;
}) {
  const [view, setView] = useState<ViewMode>("liste");
  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [projects, setProjects] = useState<ProjectListItem[]>(initialProjects);
  const [quickFilter, setQuickFilter] = useState<ProjekterQuickFilter>("alle");
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const advancedFiltered = useMemo(() => applyFilters(projects, filters), [projects, filters]);

  const quickFiltered = useMemo(
    () => applyQuickFilter(advancedFiltered, quickFilter, currentUserId),
    [advancedFiltered, quickFilter, currentUserId],
  );

  const onProjectsUpdate = useCallback(
    (updater: (prev: ProjectListItem[]) => ProjectListItem[]) => {
      setProjects(updater);
    },
    [],
  );

  const segBtn = (active: boolean) =>
    `flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? "bg-white text-primary shadow-sm"
        : "font-medium text-on-surface-variant hover:text-on-surface"
    }`;

  return (
    <div className="-mx-8 -mt-8">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex h-16 min-h-16 items-center justify-between px-8">
          <h1 className="text-base font-extrabold tracking-tight text-primary-container">Projekter</h1>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 font-body text-xs font-medium text-on-primary hover:opacity-90"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Nyt projekt
          </button>
        </div>
        <div className="flex min-h-14 items-center justify-between gap-4 px-8 py-3">
          <div className="flex min-w-0 flex-wrap items-center rounded-lg border border-[#e8e8e8] bg-white p-1">
            <button type="button" onClick={() => setView("liste")} className={segBtn(view === "liste")}>
              <span className="material-symbols-outlined text-sm">list</span>
              Liste
            </button>
            <button type="button" onClick={() => setView("kanban")} className={segBtn(view === "kanban")}>
              <span className="material-symbols-outlined text-sm">view_kanban</span>
              Kanban
            </button>
            <button type="button" onClick={() => setView("kalender")} className={segBtn(view === "kalender")}>
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              Kalender
            </button>
            <button type="button" onClick={() => setView("tabel")} className={segBtn(view === "tabel")}>
              <span className="material-symbols-outlined text-sm">table_rows</span>
              Tabel
            </button>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 font-body text-xs font-semibold text-primary hover:opacity-90"
          >
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Filtrer
          </button>
          {filtersOpen ? (
            <div className="mt-3 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 font-body text-[11px] text-on-surface-variant">
                Ejer
                <select
                  value={filters.ownerId}
                  onChange={(e) => setFilters((f) => ({ ...f, ownerId: e.target.value }))}
                  className="rounded-md border border-outline-variant/40 bg-surface-container-lowest px-2 py-2 text-[13px] text-on-surface"
                >
                  <option value="">Alle</option>
                  {ownerOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 font-body text-[11px] text-on-surface-variant">
                Status
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      status: e.target.value as ProjectStatus | "",
                    }))
                  }
                  className="rounded-md border border-outline-variant/40 bg-surface-container-lowest px-2 py-2 text-[13px] text-on-surface"
                >
                  <option value="">Alle</option>
                  <option value="NOT_STARTED">Ikke startet</option>
                  <option value="IN_PROGRESS">I gang</option>
                  <option value="WAITING">Afventer</option>
                  <option value="COMPLETED">Fuldført</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 font-body text-[11px] text-on-surface-variant">
                Prioritet
                <select
                  value={filters.priority}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      priority: e.target.value as Priority | "",
                    }))
                  }
                  className="rounded-md border border-outline-variant/40 bg-surface-container-lowest px-2 py-2 text-[13px] text-on-surface"
                >
                  <option value="">Alle</option>
                  <option value="LOW">Lav</option>
                  <option value="MEDIUM">Mellem</option>
                  <option value="HIGH">Høj</option>
                </select>
              </label>
              <div className="flex flex-col gap-1 font-body text-[11px] text-on-surface-variant">
                <span>Frist</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="date"
                    value={filters.deadlineFrom}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, deadlineFrom: e.target.value }))
                    }
                    aria-label="Frist fra"
                    className="min-w-0 flex-1 rounded-md border border-outline-variant/40 bg-surface-container-lowest px-2 py-2 text-[13px] text-on-surface"
                  />
                  <input
                    type="date"
                    value={filters.deadlineTo}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, deadlineTo: e.target.value }))
                    }
                    aria-label="Frist til"
                    className="min-w-0 flex-1 rounded-md border border-outline-variant/40 bg-surface-container-lowest px-2 py-2 text-[13px] text-on-surface"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-8 py-8">
        {view === "liste" ? (
          <ProjekterListView
            projects={quickFiltered}
            quickFilter={quickFilter}
            onQuickFilterChange={setQuickFilter}
            showCompleted={showCompleted}
            onShowCompleted={() => setShowCompleted(true)}
            onNytProjekt={() => setCreateOpen(true)}
          />
        ) : view === "kanban" ? (
          <ProjekterKanban projects={advancedFiltered} onProjectsUpdate={onProjectsUpdate} />
        ) : view === "kalender" ? (
          <div className="rounded-xl bg-surface-container-lowest p-12 text-center font-body text-sm text-on-surface-variant shadow-sm ring-1 ring-black/5">
            Kalendervisning kommer snart.
          </div>
        ) : (
          <div className="rounded-xl bg-surface-container-lowest p-12 text-center font-body text-sm text-on-surface-variant shadow-sm ring-1 ring-black/5">
            Tabelvisning kommer snart.
          </div>
        )}
      </div>

      <NytProjektModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        users={usersForCreate}
      />
    </div>
  );
}
