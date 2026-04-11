"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectListItem } from "@/types/projekter";
import { NytProjektModal } from "./NytProjektModal";
import {
  ProjekterListView,
  type ProjekterQuickFilter,
} from "./ProjectCard";
import { ProjekterKanban } from "./ProjekterKanban";

type ViewMode = "liste" | "kanban" | "kalender" | "tabel";

const QUICK_FILTER_PILLS: { id: ProjekterQuickFilter; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "mine", label: "Mine" },
  { id: "hoj_prioritet", label: "Høj prioritet" },
  { id: "overskredet", label: "Overskredet" },
];

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
  usersForCreate,
  currentUserId,
}: {
  initialProjects: ProjectListItem[];
  usersForCreate: { id: string; name: string; email: string }[];
  currentUserId: string;
}) {
  const [view, setView] = useState<ViewMode>("liste");
  const [createOpen, setCreateOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectListItem[]>(initialProjects);
  const [quickFilter, setQuickFilter] = useState<ProjekterQuickFilter>("alle");
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const quickFiltered = useMemo(
    () => applyQuickFilter(projects, quickFilter, currentUserId),
    [projects, quickFilter, currentUserId],
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
    <div className="-mx-8">
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
        <div className="flex min-h-14 items-center justify-start gap-4 px-8 py-3">
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
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-8 py-3">
          <div className="flex min-w-0 flex-wrap gap-2">
            {QUICK_FILTER_PILLS.map((p) => {
              const active = quickFilter === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setQuickFilter(p.id)}
                  className="rounded-[6px] border px-[14px] py-[6px] font-body text-[13px] font-medium transition-colors"
                  style={
                    active
                      ? {
                          backgroundColor: "#1a3167",
                          color: "#fff",
                          borderColor: "#1a3167",
                        }
                      : {
                          backgroundColor: "#fff",
                          color: "#0f1923",
                          borderColor: "#e8e8e8",
                        }
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 font-body text-xs font-semibold text-primary">
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Filtrer
          </span>
        </div>
      </div>

      <div className="px-8 py-8">
        {view === "liste" ? (
          <ProjekterListView
            projects={quickFiltered}
            showCompleted={showCompleted}
            onShowCompleted={() => setShowCompleted(true)}
            onNytProjekt={() => setCreateOpen(true)}
          />
        ) : view === "kanban" ? (
          <ProjekterKanban projects={quickFiltered} onProjectsUpdate={onProjectsUpdate} />
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
