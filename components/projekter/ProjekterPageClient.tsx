"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Priority, ProjectStatus } from "@prisma/client";
import type { ProjectListItem } from "@/types/projekter";
import { NytProjektModal } from "./NytProjektModal";
import { ProjekterListView } from "./ProjectCard";
import { ProjekterKanban } from "./ProjekterKanban";

type ViewMode = "liste" | "kanban";

type StatusFilter = "alle" | ProjectStatus;
type PriorityFilter = "alle" | Priority;
type FristFilter = "alle" | "overskredet" | "uden" | "med";

const PAGE_SIZE = 10;

function applyTableFilters(
  projects: ProjectListItem[],
  statusFilter: StatusFilter,
  priorityFilter: PriorityFilter,
  fristFilter: FristFilter,
): ProjectListItem[] {
  const now = new Date();
  return projects.filter((p) => {
    if (statusFilter !== "alle" && p.status !== statusFilter) return false;
    if (priorityFilter !== "alle" && p.priority !== priorityFilter) return false;
    const deadline = p.deadline ? new Date(p.deadline) : null;
    if (fristFilter === "overskredet") {
      if (deadline === null || deadline >= now || p.status === "COMPLETED") {
        return false;
      }
    } else if (fristFilter === "uden") {
      if (p.deadline != null) return false;
    } else if (fristFilter === "med") {
      if (p.deadline == null) return false;
    }
    return true;
  });
}

export default function ProjekterPageClient({
  initialProjects,
  usersForCreate,
  currentUserId: _currentUserId,
}: {
  initialProjects: ProjectListItem[];
  usersForCreate: { id: string; name: string; email: string }[];
  currentUserId: string;
}) {
  void _currentUserId;
  const [view, setView] = useState<ViewMode>("liste");
  const [createOpen, setCreateOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectListItem[]>(initialProjects);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("alle");
  const [fristFilter, setFristFilter] = useState<FristFilter>("alle");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, fristFilter]);

  const filtered = useMemo(
    () => applyTableFilters(projects, statusFilter, priorityFilter, fristFilter),
    [projects, statusFilter, priorityFilter, fristFilter],
  );

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount);

  const paged = useMemo(
    () => filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE),
    [filtered, pageSafe],
  );

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    if (pageCount <= maxButtons) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    let from = Math.max(1, pageSafe - 2);
    const to = Math.min(pageCount, from + maxButtons - 1);
    if (to - from < maxButtons - 1) from = Math.max(1, to - maxButtons + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [pageCount, pageSafe]);

  const onProjectsUpdate = useCallback(
    (updater: (prev: ProjectListItem[]) => ProjectListItem[]) => {
      setProjects(updater);
    },
    [],
  );

  const hasActiveFilters =
    statusFilter !== "alle" || priorityFilter !== "alle" || fristFilter !== "alle";

  const clearFilters = () => {
    setStatusFilter("alle");
    setPriorityFilter("alle");
    setFristFilter("alle");
  };

  const segBtn = (active: boolean) =>
    `flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? "bg-white text-[#001533] shadow-sm"
        : "font-medium text-[#6b7280] hover:text-[#0f1923]"
    }`;

  const selectClass =
    "h-9 min-w-[118px] rounded-md border border-[#e8e8e8] bg-white px-2.5 font-body text-xs text-[#0f1923] focus:border-[#001533] focus:outline-none focus:ring-1 focus:ring-[#001533]";

  const start = total === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const end = Math.min(pageSafe * PAGE_SIZE, total);

  return (
    <div className="-mx-8">
      <div className="px-8 pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[#001533]">Projekter</h1>
            <p className="mt-1 font-body text-[13px] leading-snug text-[#6b7280]">
              Administrer og overvåg dine aktive arbejdsprocesser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-md bg-[#001533] px-4 py-2.5 font-body text-xs font-semibold text-white shadow-sm hover:opacity-90"
          >
            <span aria-hidden className="text-base font-semibold leading-none">
              +
            </span>
            Nyt projekt
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center rounded-lg border border-[#e8e8e8] bg-[#f8f9fa] p-1">
            <button type="button" onClick={() => setView("liste")} className={segBtn(view === "liste")}>
              <span className="material-symbols-outlined text-sm leading-none">list</span>
              Liste
            </button>
            <button type="button" onClick={() => setView("kanban")} className={segBtn(view === "kanban")}>
              <span className="material-symbols-outlined text-sm leading-none">view_kanban</span>
              Kanban
            </button>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="filter-status">
              Status
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={selectClass}
            >
              <option value="alle">Alle</option>
              <option value="NOT_STARTED">Ikke startet</option>
              <option value="IN_PROGRESS">I gang</option>
              <option value="WAITING">Stoppet</option>
              <option value="COMPLETED">Fuldført</option>
            </select>

            <label className="sr-only" htmlFor="filter-priority">
              Prioritet
            </label>
            <select
              id="filter-priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              className={selectClass}
            >
              <option value="alle">Alle</option>
              <option value="HIGH">Høj</option>
              <option value="MEDIUM">Mellem</option>
              <option value="LOW">Lav</option>
            </select>

            <label className="sr-only" htmlFor="filter-frist">
              Frist
            </label>
            <select
              id="filter-frist"
              value={fristFilter}
              onChange={(e) => setFristFilter(e.target.value as FristFilter)}
              className={selectClass}
            >
              <option value="alle">Alle</option>
              <option value="overskredet">Overskredet</option>
              <option value="uden">Uden frist</option>
              <option value="med">Med frist</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 font-body text-xs font-semibold transition-colors ${
                hasActiveFilters
                  ? "border-[#001533] bg-white text-[#001533] hover:bg-[#f8f9fa]"
                  : "border-[#e8e8e8] bg-white text-[#6b7280] hover:bg-[#f8f9fa]"
              }`}
              title="Ryd filtre"
            >
              <span className="text-[14px] leading-none" aria-hidden>
                ≡
              </span>
              Filtrer
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 pb-8 pt-6">
        {view === "liste" ? (
          <>
            <ProjekterListView projects={paged} onNytProjekt={() => setCreateOpen(true)} />
            {total > 0 ? (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#e8e8e8] pt-4">
                <p className="font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                  Viser {start} – {end} af {total} projekter
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Forrige side"
                    disabled={pageSafe <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded border border-[#e8e8e8] text-sm text-[#001533] hover:bg-[#f8f9fa] disabled:pointer-events-none disabled:opacity-40"
                  >
                    ‹
                  </button>
                  {pageNumbers.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`flex h-8 min-w-[2rem] items-center justify-center rounded px-2 text-xs font-semibold ${
                        n === pageSafe
                          ? "bg-[#001533] text-white"
                          : "border border-transparent text-[#001533] hover:bg-[#f8f9fa]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Næste side"
                    disabled={pageSafe >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded border border-[#e8e8e8] text-sm text-[#001533] hover:bg-[#f8f9fa] disabled:pointer-events-none disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <ProjekterKanban projects={filtered} onProjectsUpdate={onProjectsUpdate} />
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
