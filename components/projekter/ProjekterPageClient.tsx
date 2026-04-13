"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Priority, ProjectStatus } from "@prisma/client";
import type { ProjectListItem } from "@/types/projekter";
import { NytProjektModal } from "./NytProjektModal";
import { ProjekterListView } from "./ProjectCard";
import { ProjekterKanban } from "./ProjekterKanban";

type ViewMode = "liste" | "kanban";

type StatusFilter = "alle" | ProjectStatus;
type PriorityFilter = "alle" | Priority;
type FristFilter = "alle" | "overskredet" | "uden" | "med";

type OpenFilter = null | "status" | "priority" | "frist";

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

function statusFilterButtonLabel(v: StatusFilter): string {
  if (v === "alle") return "Status";
  switch (v) {
    case "NOT_STARTED":
      return "Ikke startet";
    case "IN_PROGRESS":
      return "I gang";
    case "WAITING":
      return "Stoppet";
    case "COMPLETED":
      return "Fuldført";
  }
}

function priorityFilterButtonLabel(v: PriorityFilter): string {
  if (v === "alle") return "Prioritet";
  switch (v) {
    case "HIGH":
      return "Høj";
    case "MEDIUM":
      return "Mellem";
    case "LOW":
      return "Lav";
  }
}

function fristFilterButtonLabel(v: FristFilter): string {
  if (v === "alle") return "Frist";
  switch (v) {
    case "overskredet":
      return "Overskredet";
    case "uden":
      return "Uden frist";
    case "med":
      return "Med frist";
  }
}

function menuItemClass(active: boolean): string {
  return `block w-full px-4 py-2 text-left font-body text-xs ${
    active ? "bg-[#f8f9fa] font-semibold text-[#0f1923]" : "text-[#6b7280] hover:bg-[#f8f9fa]"
  }`;
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
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);

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
    setOpenFilter(null);
  };

  const statusFilterRef = useRef<HTMLDivElement>(null);
  const priorityFilterRef = useRef<HTMLDivElement>(null);
  const fristFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openFilter) return;
    function handle(e: MouseEvent) {
      const t = e.target as Node;
      if (openFilter === "status" && statusFilterRef.current?.contains(t)) return;
      if (openFilter === "priority" && priorityFilterRef.current?.contains(t)) return;
      if (openFilter === "frist" && fristFilterRef.current?.contains(t)) return;
      setOpenFilter(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [openFilter]);

  const segBtn = (active: boolean) =>
    `flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? "bg-white text-[#001533] shadow-sm"
        : "font-medium text-[#6b7280] hover:text-[#0f1923]"
    }`;

  const start = total === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1;
  const end = Math.min(pageSafe * PAGE_SIZE, total);

  const filterTriggerClass =
    "inline-flex items-center gap-1 rounded-md border-0 bg-transparent px-1 py-1.5 font-body text-xs text-[#6b7280] hover:text-[#0f1923] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3167]/30";

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
            className="flex shrink-0 items-center gap-2 rounded-md bg-[#1a3167] px-4 py-2.5 font-body text-xs font-semibold text-white shadow-sm hover:opacity-90"
          >
            <span aria-hidden className="text-base font-semibold leading-none">
              +
            </span>
            Nyt projekt
          </button>
        </div>

        <div className="mt-8 flex w-full flex-wrap items-center justify-between gap-4">
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

          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
            <div className="relative" ref={statusFilterRef}>
              <button
                type="button"
                className={filterTriggerClass}
                aria-expanded={openFilter === "status"}
                aria-haspopup="menu"
                onClick={() => setOpenFilter((o) => (o === "status" ? null : "status"))}
              >
                <span>{statusFilterButtonLabel(statusFilter)}</span>
                <span className="text-[10px] text-[#9ca3af]" aria-hidden>
                  ∨
                </span>
              </button>
              {openFilter === "status" ? (
                <div
                  className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-md border border-[#e8e8e8] bg-white py-1 shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(statusFilter === "alle")}
                    onClick={() => {
                      setStatusFilter("alle");
                      setOpenFilter(null);
                    }}
                  >
                    Alle
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(statusFilter === "NOT_STARTED")}
                    onClick={() => {
                      setStatusFilter("NOT_STARTED");
                      setOpenFilter(null);
                    }}
                  >
                    Ikke startet
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(statusFilter === "IN_PROGRESS")}
                    onClick={() => {
                      setStatusFilter("IN_PROGRESS");
                      setOpenFilter(null);
                    }}
                  >
                    I gang
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(statusFilter === "WAITING")}
                    onClick={() => {
                      setStatusFilter("WAITING");
                      setOpenFilter(null);
                    }}
                  >
                    Stoppet
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(statusFilter === "COMPLETED")}
                    onClick={() => {
                      setStatusFilter("COMPLETED");
                      setOpenFilter(null);
                    }}
                  >
                    Fuldført
                  </button>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={priorityFilterRef}>
              <button
                type="button"
                className={filterTriggerClass}
                aria-expanded={openFilter === "priority"}
                aria-haspopup="menu"
                onClick={() => setOpenFilter((o) => (o === "priority" ? null : "priority"))}
              >
                <span>{priorityFilterButtonLabel(priorityFilter)}</span>
                <span className="text-[10px] text-[#9ca3af]" aria-hidden>
                  ∨
                </span>
              </button>
              {openFilter === "priority" ? (
                <div
                  className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-md border border-[#e8e8e8] bg-white py-1 shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(priorityFilter === "alle")}
                    onClick={() => {
                      setPriorityFilter("alle");
                      setOpenFilter(null);
                    }}
                  >
                    Alle
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(priorityFilter === "HIGH")}
                    onClick={() => {
                      setPriorityFilter("HIGH");
                      setOpenFilter(null);
                    }}
                  >
                    Høj
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(priorityFilter === "MEDIUM")}
                    onClick={() => {
                      setPriorityFilter("MEDIUM");
                      setOpenFilter(null);
                    }}
                  >
                    Mellem
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(priorityFilter === "LOW")}
                    onClick={() => {
                      setPriorityFilter("LOW");
                      setOpenFilter(null);
                    }}
                  >
                    Lav
                  </button>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={fristFilterRef}>
              <button
                type="button"
                className={filterTriggerClass}
                aria-expanded={openFilter === "frist"}
                aria-haspopup="menu"
                onClick={() => setOpenFilter((o) => (o === "frist" ? null : "frist"))}
              >
                <span>{fristFilterButtonLabel(fristFilter)}</span>
                <span className="text-[10px] text-[#9ca3af]" aria-hidden>
                  ∨
                </span>
              </button>
              {openFilter === "frist" ? (
                <div
                  className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-md border border-[#e8e8e8] bg-white py-1 shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(fristFilter === "alle")}
                    onClick={() => {
                      setFristFilter("alle");
                      setOpenFilter(null);
                    }}
                  >
                    Alle
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(fristFilter === "overskredet")}
                    onClick={() => {
                      setFristFilter("overskredet");
                      setOpenFilter(null);
                    }}
                  >
                    Overskredet
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(fristFilter === "uden")}
                    onClick={() => {
                      setFristFilter("uden");
                      setOpenFilter(null);
                    }}
                  >
                    Uden frist
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass(fristFilter === "med")}
                    onClick={() => {
                      setFristFilter("med");
                      setOpenFilter(null);
                    }}
                  >
                    Med frist
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className={`inline-flex items-center gap-1.5 rounded-md border-0 bg-transparent px-1 py-1.5 font-body text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3167]/30 ${
                hasActiveFilters ? "font-semibold text-[#1a3167]" : "text-[#6b7280] hover:text-[#0f1923]"
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
            <div className="overflow-hidden rounded-[8px] border border-[#e8e8e8] bg-white">
              <ProjekterListView projects={paged} onNytProjekt={() => setCreateOpen(true)} />
            </div>
            {total > 0 ? (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <p className="font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                  Viser {start} – {end} af {total} projekter
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Forrige side"
                    disabled={pageSafe <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#e8e8e8] bg-white text-sm text-[#0f1923] hover:bg-[#f8f9fa] disabled:pointer-events-none disabled:opacity-40"
                  >
                    ‹
                  </button>
                  {pageNumbers.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`flex h-8 min-w-[2rem] items-center justify-center rounded-[6px] px-2 text-xs font-semibold ${
                        n === pageSafe
                          ? "bg-[#1a3167] text-white"
                          : "border border-[#e8e8e8] bg-white text-[#0f1923] hover:bg-[#f8f9fa]"
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
                    className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#e8e8e8] bg-white text-sm text-[#0f1923] hover:bg-[#f8f9fa] disabled:pointer-events-none disabled:opacity-40"
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
