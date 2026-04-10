"use client";

import type { Priority, ProjectStatus } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectListItem } from "@/types/projekter";
import { NytProjektModal } from "./NytProjektModal";
import { ProjectCard } from "./ProjectCard";
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

export default function ProjekterPageClient({
  initialProjects,
  ownerOptions,
  usersForCreate,
}: {
  initialProjects: ProjectListItem[];
  ownerOptions: { id: string; name: string }[];
  usersForCreate: { id: string; name: string; email: string }[];
}) {
  const [view, setView] = useState<ViewMode>("liste");
  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [projects, setProjects] = useState<ProjectListItem[]>(initialProjects);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const filtered = useMemo(() => applyFilters(projects, filters), [projects, filters]);

  const onProjectsUpdate = useCallback(
    (updater: (prev: ProjectListItem[]) => ProjectListItem[]) => {
      setProjects(updater);
    },
    []
  );

  const toggleClass = (active: boolean) =>
    `border-b-2 px-2 py-1 font-body text-[13px] transition-colors ${
      active
        ? "border-app-sidebar font-medium text-app-sidebar"
        : "border-transparent text-on-surface-variant hover:text-app-sidebar"
    }`;

  return (
    <div className="-mx-7 -mt-6">
      <div className="sticky top-0 z-30 border-b border-app-topbar-border bg-white">
        <div className="flex h-[52px] items-center justify-between px-7">
          <h1 className="font-body text-[15px] font-medium text-app-sidebar">
            Projekter
          </h1>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-2">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="shrink-0 rounded-md bg-[#1a3167] px-4 py-[7px] font-body text-[12px] font-medium text-white transition-opacity hover:opacity-90"
            >
              + Nyt projekt
            </button>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-1">
              <button type="button" onClick={() => setView("liste")} className={toggleClass(view === "liste")}>
                Liste
              </button>
              <button type="button" onClick={() => setView("kanban")} className={toggleClass(view === "kanban")}>
                Kanban
              </button>
              <button type="button" onClick={() => setView("kalender")} className={toggleClass(view === "kalender")}>
                Kalender
              </button>
              <button type="button" onClick={() => setView("tabel")} className={toggleClass(view === "tabel")}>
                Tabel
              </button>
            </div>
          </div>
        </div>
        <div className="px-7 pb-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="font-body text-[12px] text-app-sidebar/80 underline-offset-2 hover:text-app-sidebar hover:underline"
          >
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

      <div className="px-7 py-6">
        {filtered.length === 0 ? (
          <p className="rounded-xl bg-surface-container-lowest p-8 text-center font-body text-sm text-on-surface-variant/80">
            Ingen projekter matcher filtrene — eller du har ingen projekter endnu.
          </p>
        ) : view === "liste" ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : view === "kanban" ? (
          <ProjekterKanban projects={filtered} onProjectsUpdate={onProjectsUpdate} />
        ) : view === "kalender" ? (
          <div className="rounded-xl border border-app-topbar-border bg-surface-container-lowest p-12 text-center font-body text-sm text-on-surface-variant/80">
            Kalendervisning kommer snart.
          </div>
        ) : (
          <div className="rounded-xl border border-app-topbar-border bg-surface-container-lowest p-12 text-center font-body text-sm text-on-surface-variant/80">
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
