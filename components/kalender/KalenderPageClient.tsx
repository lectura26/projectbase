"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { projectColorForId } from "@/lib/calendar-palette";
import type {
  KalenderEvent,
  KalenderProject,
  KalenderTaskDeadline,
  KalenderUserOption,
} from "@/types/kalender";

type ViewMode = "week" | "month";

type PopoverState =
  | null
  | {
      x: number;
      y: number;
      kind: "event";
      item: KalenderEvent;
    }
  | {
      x: number;
      y: number;
      kind: "deadline";
      item: KalenderTaskDeadline;
    };

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function dayKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMondayWeek(ref: Date) {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const WEEKDAY_DA = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

type Props = {
  projects: KalenderProject[];
  events: KalenderEvent[];
  tasks: KalenderTaskDeadline[];
  users: KalenderUserOption[];
};

export default function KalenderPageClient({
  projects,
  events,
  tasks,
  users,
}: Props) {
  const [view, setView] = useState<ViewMode>("week");
  const [weekAnchor, setWeekAnchor] = useState(() => startOfMondayWeek(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [projectFilter, setProjectFilter] = useState<Set<string>>(new Set());
  const [personId, setPersonId] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverState>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (projectFilter.size > 0 && !projectFilter.has(e.projectId)) return false;
      if (!personId) return true;
      const p = projectMap.get(e.projectId);
      if (!p) return false;
      if (p.ownerId === personId) return true;
      return p.memberIds.includes(personId);
    });
  }, [events, projectFilter, personId, projectMap]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter.size > 0 && !projectFilter.has(t.projectId)) return false;
      if (!personId) return true;
      if (t.assigneeId === personId) return true;
      const p = projectMap.get(t.projectId);
      if (t.assigneeId === null && p?.ownerId === personId) return true;
      return false;
    });
  }, [tasks, projectFilter, personId, projectMap]);

  const itemsByDay = useCallback(
    (key: string) => {
      const evs = filteredEvents.filter((e) => dayKeyLocal(new Date(e.date)) === key);
      const tks = filteredTasks.filter(
        (t) => dayKeyLocal(new Date(t.deadline)) === key,
      );
      return {
        events: evs,
        deadlines: tks,
      };
    },
    [filteredEvents, filteredTasks],
  );

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) days.push(addDays(weekAnchor, i));
    return days;
  }, [weekAnchor]);

  const monthCells = useMemo(() => {
    const y = monthAnchor.getFullYear();
    const m = monthAnchor.getMonth();
    const first = new Date(y, m, 1);
    const startPad = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - startPad);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
    return cells;
  }, [monthAnchor]);

  function toggleProject(id: string) {
    setProjectFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearProjectFilter() {
    setProjectFilter(new Set());
  }

  function openPopover(
    e: React.MouseEvent,
    payload:
      | { kind: "event"; item: KalenderEvent }
      | { kind: "deadline"; item: KalenderTaskDeadline },
  ) {
    setPopover({ ...payload, x: e.clientX, y: e.clientY });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-body text-sm font-medium text-primary-container">
            Filtre
          </span>
          <div className="flex max-w-xl flex-wrap gap-1">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProject(p.id)}
                className={`rounded-full px-2.5 py-1 font-body text-[11px] font-medium ${
                  projectFilter.size === 0 || projectFilter.has(p.id)
                    ? "bg-primary text-on-primary"
                    : "border border-outline-variant/20 bg-white text-on-surface-variant"
                }`}
              >
                {p.name}
              </button>
            ))}
            {projects.length > 0 ? (
              <button
                type="button"
                onClick={clearProjectFilter}
                className="rounded-full border border-dashed border-outline-variant/20 px-2 py-1 text-[11px] text-on-surface-variant"
              >
                Alle projekter
              </button>
            ) : null}
          </div>
          <label className="ml-2 flex items-center gap-2 font-body text-sm">
            Person
            <select
              value={personId ?? ""}
              onChange={(e) => setPersonId(e.target.value || null)}
              className="rounded-lg border border-outline-variant/20 bg-white px-2 py-1 text-sm"
            >
              <option value="">Alle</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          {view === "week" ? (
            <>
              <button
                type="button"
                onClick={() => setWeekAnchor((a) => addDays(a, -7))}
                className="rounded-lg border border-outline-variant/20 px-2 py-1 text-sm"
              >
                ←
              </button>
              <span className="text-sm text-on-surface-variant">
                Uge{" "}
                {weekDays[0].toLocaleDateString("da-DK", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                –{" "}
                {weekDays[6].toLocaleDateString("da-DK", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <button
                type="button"
                onClick={() => setWeekAnchor((a) => addDays(a, 7))}
                className="rounded-lg border border-outline-variant/20 px-2 py-1 text-sm"
              >
                →
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  setMonthAnchor(
                    new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1),
                  )
                }
                className="rounded-lg border border-outline-variant/20 px-2 py-1 text-sm"
              >
                ←
              </button>
              <span className="min-w-[8rem] text-center text-sm font-medium capitalize">
                {monthAnchor.toLocaleDateString("da-DK", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <button
                type="button"
                onClick={() =>
                  setMonthAnchor(
                    new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1),
                  )
                }
                className="rounded-lg border border-outline-variant/20 px-2 py-1 text-sm"
              >
                →
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setView((v) => (v === "week" ? "month" : "week"))}
            className="ml-2 rounded-lg bg-primary px-4 py-1.5 font-body text-sm font-medium text-on-primary hover:opacity-90"
          >
            {view === "week" ? "Måned" : "Uge"}
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-on-surface-variant/90">Ingen projekter med kalenderdata endnu.</p>
      ) : null}

      <div className="rounded-xl border border-outline-variant/20 bg-white p-4">
        {view === "week" ? (
          <div className="grid min-h-[320px] grid-cols-7 gap-2">
            {weekDays.map((d, i) => {
              const key = dayKeyLocal(d);
              const { events: evs, deadlines: dls } = itemsByDay(key);
              return (
                <div
                  key={key}
                  className="flex min-h-[280px] flex-col rounded-lg border border-outline-variant/15 bg-surface-container-low/30 p-2"
                >
                  <p className="mb-2 font-body text-[11px] font-bold uppercase text-on-surface-variant">
                    {WEEKDAY_DA[i]} {d.getDate()}.{pad2(d.getMonth() + 1)}
                  </p>
                  <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                    {evs.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={(ev) => openPopover(ev, { kind: "event", item: e })}
                        style={{
                          backgroundColor: projectColorForId(e.projectId),
                        }}
                        className="rounded px-2 py-1 text-left font-body text-[10px] font-medium text-white shadow-sm"
                      >
                        {e.eventTime ? `${e.eventTime} · ` : ""}
                        {e.title}
                      </button>
                    ))}
                    {dls.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={(ev) =>
                          openPopover(ev, { kind: "deadline", item: t })
                        }
                        style={{
                          backgroundColor: projectColorForId(t.projectId),
                          opacity: 0.92,
                        }}
                        className="rounded px-2 py-1 text-left font-body text-[10px] font-medium text-white shadow-sm"
                      >
                        ⏳ {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-on-surface-variant">
              {WEEKDAY_DA.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((d) => {
                const key = dayKeyLocal(d);
                const inMonth = d.getMonth() === monthAnchor.getMonth();
                const { events: evs, deadlines: dls } = itemsByDay(key);
                const total = evs.length + dls.length;
                const firstLabel =
                  evs[0]?.title ?? dls[0]?.title ?? "";
                return (
                  <div
                    key={`${key}-${d.getTime()}`}
                    className={`min-h-[72px] rounded border p-1 text-left text-[11px] ${
                      inMonth
                        ? "border-outline-variant/20 bg-white"
                        : "border-transparent bg-surface-container-low/50 text-on-surface-variant/50"
                    }`}
                  >
                    <span className="font-semibold">{d.getDate()}</span>
                    {total > 0 ? (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-on-surface">
                        {total === 1 ? firstLabel : `${total} begivenheder`}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {filteredEvents.length === 0 && filteredTasks.length === 0 && projects.length > 0 ? (
          <p className="mt-4 text-center text-sm text-on-surface-variant/90">
            Ingen begivenheder eller deadlines i denne periode.
          </p>
        ) : null}
      </div>

      {popover ? (
        <div
          ref={popoverRef}
          className="fixed z-[200] w-64 rounded-xl border border-outline-variant/20 bg-white p-3 shadow-lg"
          style={{
            left: Math.min(popover.x, typeof window !== "undefined" ? window.innerWidth - 280 : 0),
            top: popover.y + 8,
          }}
          role="dialog"
        >
          <button
            type="button"
            className="absolute right-2 top-2 text-on-surface-variant hover:text-on-surface"
            aria-label="Luk"
            onClick={() => setPopover(null)}
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
          {popover.kind === "event" ? (
            <>
              <p className="pr-6 font-headline text-sm font-semibold text-primary">
                {popover.item.title}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Projekt: {popover.item.projectName}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {new Date(popover.item.date).toLocaleDateString("da-DK", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {popover.item.eventTime ? ` · ${popover.item.eventTime}` : ""}
              </p>
              <a
                href={`/projekter/${popover.item.projectId}`}
                className="mt-3 inline-block text-xs font-medium text-primary underline"
              >
                Gå til projekt
              </a>
            </>
          ) : (
            <>
              <p className="pr-6 font-headline text-sm font-semibold text-primary">
                Opgave: {popover.item.title}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Projekt: {popover.item.projectName}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Frist:{" "}
                {new Date(popover.item.deadline).toLocaleString("da-DK", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <a
                href={`/projekter/${popover.item.projectId}`}
                className="mt-3 inline-block text-xs font-medium text-primary underline"
              >
                Gå til projekt
              </a>
            </>
          )}
        </div>
      ) : null}

      {popover ? (
        <button
          type="button"
          className="fixed inset-0 z-[199] cursor-default bg-transparent"
          aria-label="Luk"
          onClick={() => setPopover(null)}
        />
      ) : null}
    </div>
  );
}
