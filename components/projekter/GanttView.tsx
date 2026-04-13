"use client";

import type { ProjectStatus, TaskStatus } from "@prisma/client";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getISOWeek,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { da } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getGanttTasksForProject } from "@/app/(dashboard)/projekter/gantt-actions";
import type { GanttTaskRow, ProjectListItem } from "@/types/projekter";
import { BADGE_CHIP_CLASS, statusBadgeClass, statusLabelDa } from "./project-helpers";

function actionErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return (e as { message: string }).message;
  }
  return "Kunne ikke hente opgaver.";
}

type Zoom = "day" | "week" | "month";

const LEFT_W = 240;
const ROW_H = 44;
const BAR_H = 20;
const HEADER_H = 44;

function taskStatusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case "TODO":
      return "bg-[#f3f4f6] text-[#6b7280]";
    case "IN_PROGRESS":
      return "bg-[#dbeafe] text-[#1e40af]";
    case "DONE":
      return "bg-[#dcfce7] text-[#15803d]";
    default:
      return "bg-[#f3f4f6] text-[#6b7280]";
  }
}

function taskStatusLabelDa(status: TaskStatus): string {
  switch (status) {
    case "TODO":
      return "Todo";
    case "IN_PROGRESS":
      return "I gang";
    case "DONE":
      return "Færdig";
  }
}

function projectBarColor(status: ProjectStatus): string {
  switch (status) {
    case "WAITING":
      return "#9ca3af";
    case "COMPLETED":
      return "#16a34a";
    case "NOT_STARTED":
    case "IN_PROGRESS":
    default:
      return "#1a3167";
  }
}

function taskBarColor(status: TaskStatus): string {
  switch (status) {
    case "DONE":
      return "#16a34a";
    case "TODO":
    case "IN_PROGRESS":
    default:
      return "#1a3167";
  }
}

function projectDateRange(p: ProjectListItem): { start: Date; end: Date } {
  const start = p.startDate
    ? startOfDay(new Date(p.startDate))
    : startOfDay(new Date(p.createdAt));
  const end = p.deadline
    ? startOfDay(new Date(p.deadline))
    : addDays(start, 30);
  return { start, end };
}

function taskDateRange(t: GanttTaskRow): { start: Date; end: Date } {
  const start = t.startDate
    ? startOfDay(new Date(t.startDate))
    : startOfDay(new Date(t.createdAt));
  const end = t.deadline
    ? startOfDay(new Date(t.deadline))
    : addDays(start, 14);
  return { start, end };
}

function barLayout(
  barStart: Date,
  barEnd: Date,
  rangeStart: Date,
  pixelsPerDay: number,
  totalWidth: number,
): { left: number; width: number } | null {
  const rs = startOfDay(rangeStart);
  const bs = startOfDay(barStart);
  const be = startOfDay(barEnd);
  const leftDays = differenceInCalendarDays(bs, rs);
  const spanDays = differenceInCalendarDays(be, bs) + 1;
  const left = leftDays * pixelsPerDay;
  const width = Math.max(4, spanDays * pixelsPerDay);
  const right = left + width;
  if (right <= 0 || left >= totalWidth) return null;
  const clampedLeft = Math.max(0, left);
  const clampedRight = Math.min(totalWidth, right);
  const w = Math.max(4, clampedRight - clampedLeft);
  return { left: clampedLeft, width: w };
}

function chunkWeeks(days: Date[]): Date[][] {
  const chunks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    chunks.push(days.slice(i, i + 7));
  }
  return chunks;
}

function chunkMonths(days: Date[]): { label: string; days: Date[] }[] {
  const groups: { label: string; days: Date[] }[] = [];
  for (const d of days) {
    const label = format(d, "MMMM yyyy", { locale: da });
    const last = groups[groups.length - 1];
    if (!last || last.label !== label) {
      groups.push({ label, days: [d] });
    } else {
      last.days.push(d);
    }
  }
  return groups;
}

function zoomSeg(active: boolean): string {
  return `rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
    active
      ? "bg-white text-[#001533] shadow-sm"
      : "font-medium text-[#6b7280] hover:text-[#0f1923]"
  }`;
}

export default function GanttView({
  projects,
}: {
  projects: ProjectListItem[];
}) {
  const [level, setLevel] = useState<1 | 2>(1);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [tasks, setTasks] = useState<GanttTaskRow[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [zoom, setZoom] = useState<Zoom>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const gotoTodayScrollRef = useRef(false);

  const leftBodyRef = useRef<HTMLDivElement>(null);
  const rightBodyRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const scrollLock = useRef(false);
  const initialScrollDone = useRef(false);

  const { rangeStart, days, pixelsPerDay } = useMemo(() => {
    const t = startOfDay(anchor);
    if (zoom === "day") {
      const rs = addDays(t, -30);
      const re = addDays(t, 29);
      return {
        rangeStart: rs,
        days: eachDayOfInterval({ start: rs, end: re }),
        pixelsPerDay: 40,
      };
    }
    if (zoom === "week") {
      const monday = startOfWeek(t, { weekStartsOn: 1 });
      const rs = addWeeks(monday, -6);
      const re = addDays(rs, 83);
      return {
        rangeStart: rs,
        days: eachDayOfInterval({ start: rs, end: re }),
        pixelsPerDay: 40,
      };
    }
    const first = startOfMonth(addMonths(t, -2));
    const last = endOfMonth(addMonths(t, 3));
    return {
      rangeStart: startOfDay(first),
      days: eachDayOfInterval({ start: startOfDay(first), end: startOfDay(last) }),
      pixelsPerDay: 28,
    };
  }, [zoom, anchor]);

  const totalWidth = days.length * pixelsPerDay;

  const todayIdx = useMemo(() => {
    const now = new Date();
    return days.findIndex((d) => isSameDay(d, now));
  }, [days]);

  const periodLabel = useMemo(() => {
    if (zoom === "day") {
      return format(anchor, "MMMM yyyy", { locale: da });
    }
    if (zoom === "week") {
      return `Uge ${getISOWeek(anchor)}, ${format(anchor, "yyyy")}`;
    }
    return format(anchor, "MMMM yyyy", { locale: da });
  }, [zoom, anchor]);

  useLayoutEffect(() => {
    const el = rightScrollRef.current;
    if (!el || days.length === 0) return;
    const ti = days.findIndex((d) => isSameDay(d, new Date()));
    if (ti < 0) return;
    const todayPx = ti * pixelsPerDay;
    const target = Math.max(0, todayPx - el.clientWidth / 2 + pixelsPerDay / 2);

    if (gotoTodayScrollRef.current) {
      gotoTodayScrollRef.current = false;
      requestAnimationFrame(() => {
        el.scrollLeft = target;
      });
      return;
    }

    if (!initialScrollDone.current) {
      initialScrollDone.current = true;
      requestAnimationFrame(() => {
        el.scrollLeft = target;
      });
    }
  }, [days, pixelsPerDay, anchor]);

  const onLeftScroll = useCallback(() => {
    if (scrollLock.current) return;
    scrollLock.current = true;
    if (rightBodyRef.current && leftBodyRef.current) {
      rightBodyRef.current.scrollTop = leftBodyRef.current.scrollTop;
    }
    scrollLock.current = false;
  }, []);

  const onRightScroll = useCallback(() => {
    if (scrollLock.current) return;
    scrollLock.current = true;
    if (leftBodyRef.current && rightBodyRef.current) {
      leftBodyRef.current.scrollTop = rightBodyRef.current.scrollTop;
    }
    scrollLock.current = false;
  }, []);

  useEffect(() => {
    if (level !== 2 || !selectedProjectId) {
      setTasks([]);
      setTasksError(null);
      return;
    }
    let cancelled = false;
    setTasksLoading(true);
    setTasksError(null);
    getGanttTasksForProject(selectedProjectId)
      .then((rows) => {
        if (!cancelled) setTasks(Array.isArray(rows) ? rows : []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setTasksError(actionErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [level, selectedProjectId]);

  const projectLayouts = useMemo(() => {
    return projects.map((p) => {
      const { start, end } = projectDateRange(p);
      const layout = barLayout(start, end, rangeStart, pixelsPerDay, totalWidth);
      return { project: p, layout, color: projectBarColor(p.status) };
    });
  }, [projects, rangeStart, pixelsPerDay, totalWidth]);

  const taskLayouts = useMemo(() => {
    return tasks.map((t) => {
      const { start, end } = taskDateRange(t);
      const layout = barLayout(start, end, rangeStart, pixelsPerDay, totalWidth);
      return { task: t, layout, color: taskBarColor(t.status) };
    });
  }, [tasks, rangeStart, pixelsPerDay, totalWidth]);

  const weekChunks = useMemo(() => chunkWeeks(days), [days]);
  const monthChunks = useMemo(() => chunkMonths(days), [days]);

  const handleGotoToday = () => {
    setAnchor(new Date());
    gotoTodayScrollRef.current = true;
  };

  const navPrev = () => {
    if (zoom === "day") setAnchor((a) => addDays(a, -7));
    else if (zoom === "week") setAnchor((a) => addWeeks(a, -1));
    else setAnchor((a) => addMonths(a, -1));
  };

  const navNext = () => {
    if (zoom === "day") setAnchor((a) => addDays(a, 7));
    else if (zoom === "week") setAnchor((a) => addWeeks(a, 1));
    else setAnchor((a) => addMonths(a, 1));
  };

  const leftHeader =
    level === 1 ? "PROJEKT NAVN" : "OPGAVE NAVN";

  return (
    <div className="overflow-hidden rounded-[8px] border border-[#e8e8e8] bg-white">
      <div className="border-b border-[#e8e8e8] px-4 py-3">
        {level === 2 ? (
          <button
            type="button"
            onClick={() => {
              setLevel(1);
              setSelectedProjectId(null);
            }}
            className="font-body text-[13px] font-medium text-[#1a3167] hover:underline"
          >
            ← Tilbage til projekter
          </button>
        ) : (
          <div className="h-5" aria-hidden />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e8e8e8] px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center rounded-lg border border-[#e8e8e8] bg-[#f8f9fa] p-1">
          <button
            type="button"
            className={zoomSeg(zoom === "day")}
            onClick={() => setZoom("day")}
          >
            Dag
          </button>
          <button
            type="button"
            className={zoomSeg(zoom === "week")}
            onClick={() => setZoom("week")}
          >
            Uge
          </button>
          <button
            type="button"
            className={zoomSeg(zoom === "month")}
            onClick={() => setZoom("month")}
          >
            Måned
          </button>
        </div>

        <button
          type="button"
          onClick={handleGotoToday}
          className="rounded-md border border-[#e8e8e8] bg-white px-3 py-1.5 font-body text-xs font-semibold text-[#0f1923] hover:bg-[#f8f9fa]"
        >
          Gå til i dag
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Forrige periode"
            onClick={navPrev}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#e8e8e8] bg-white text-[#0f1923] hover:bg-[#f8f9fa]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="min-w-[8rem] text-center font-body text-xs font-medium text-[#6b7280]">
            {periodLabel}
          </span>
          <button
            type="button"
            aria-label="Næste periode"
            onClick={navNext}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#e8e8e8] bg-white text-[#0f1923] hover:bg-[#f8f9fa]"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex max-h-[min(560px,calc(100vh-280px))] min-h-[320px]">
        <div
          className="flex shrink-0 flex-col border-r border-[#e8e8e8]"
          style={{ width: LEFT_W }}
        >
          <div
            className="flex shrink-0 items-end border-b border-[#e8e8e8] px-3 pb-2 pt-2 font-body text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]"
            style={{ height: HEADER_H }}
          >
            {leftHeader}
          </div>
          <div
            ref={leftBodyRef}
            onScroll={onLeftScroll}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          >
            {level === 2 && tasksLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex w-full items-center gap-2 border-b border-[#e8e8e8] px-3"
                    style={{ height: ROW_H }}
                  >
                    <FileText
                      className="h-[14px] w-[14px] shrink-0 text-[#e8e8e8]"
                      aria-hidden
                    />
                    <div className="h-3 min-w-0 flex-1 rounded bg-[#f3f4f6]" />
                  </div>
                ))
              : null}
            {level === 2 && tasksError ? (
              <div className="px-3 py-2 font-body text-[13px] text-red-600">
                {tasksError}
              </div>
            ) : null}
            {level === 1 &&
              projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setLevel(2);
                  }}
                  className="flex w-full items-center gap-2 border-b border-[#e8e8e8] px-3 text-left transition-colors hover:bg-[#f8f9fa]"
                  style={{ height: ROW_H }}
                >
                  <FileText
                    className="h-[14px] w-[14px] shrink-0 text-[#9ca3af]"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-body text-[13px] font-medium text-[#0f1923]">
                    {p.name}
                  </span>
                  <span
                    className={`${BADGE_CHIP_CLASS} shrink-0 ${statusBadgeClass(p.status)}`}
                  >
                    {statusLabelDa(p.status)}
                  </span>
                </button>
              ))}
            {level === 2 &&
              !tasksLoading &&
              tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex w-full items-center gap-2 border-b border-[#e8e8e8] px-3 transition-colors hover:bg-[#f8f9fa]"
                  style={{ height: ROW_H }}
                >
                  <FileText
                    className="h-[14px] w-[14px] shrink-0 text-[#9ca3af]"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-body text-[13px] font-medium text-[#0f1923]">
                    {t.title}
                  </span>
                  <span
                    className={`${BADGE_CHIP_CLASS} shrink-0 ${taskStatusBadgeClass(t.status)}`}
                  >
                    {taskStatusLabelDa(t.status)}
                  </span>
                </div>
              ))}
            {level === 1 && projects.length === 0 ? (
              <div className="px-3 py-6 font-body text-[13px] text-[#6b7280]">
                Ingen projekter at vise.
              </div>
            ) : null}
            {level === 2 && !tasksLoading && tasks.length === 0 && !tasksError ? (
              <div className="px-3 py-6 font-body text-[13px] text-[#6b7280]">
                Ingen opgaver i dette projekt.
              </div>
            ) : null}
          </div>
        </div>

        <div
          ref={rightScrollRef}
          className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
        >
          <div style={{ width: totalWidth, minWidth: totalWidth }}>
            <div
              className="sticky top-0 z-20 shrink-0 border-b border-[#e8e8e8] bg-white"
              style={{ width: totalWidth }}
            >
              {zoom === "day" ? (
                <div className="flex" style={{ height: HEADER_H }}>
                  {days.map((d) => (
                    <div
                      key={d.toISOString()}
                      className="flex shrink-0 flex-col items-center justify-center border-r border-[#e8e8e8] text-[11px] font-medium text-[#9ca3af]"
                      style={{ width: pixelsPerDay, height: HEADER_H }}
                    >
                      <span>{format(d, "EEE", { locale: da })}</span>
                      <span>{format(d, "d.", { locale: da })}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {zoom === "week" ? (
                <div className="flex flex-col" style={{ height: HEADER_H }}>
                  <div className="flex h-[22px]">
                    {weekChunks.map((wk) => (
                      <div
                        key={wk[0]!.toISOString()}
                        className="flex shrink-0 items-center justify-center border-b border-r border-[#e8e8e8] text-[11px] font-medium uppercase tracking-wide text-[#9ca3af]"
                        style={{ width: wk.length * pixelsPerDay }}
                      >
                        Uge {getISOWeek(wk[0]!)}
                      </div>
                    ))}
                  </div>
                  <div className="flex h-[22px]">
                    {days.map((d) => (
                      <div
                        key={d.toISOString()}
                        className="flex shrink-0 items-center justify-center border-r border-[#e8e8e8] text-[11px] text-[#9ca3af]"
                        style={{ width: pixelsPerDay }}
                      >
                        {format(d, "d.", { locale: da })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {zoom === "month" ? (
                <div className="flex flex-col" style={{ height: HEADER_H }}>
                  <div className="flex h-[22px]">
                    {monthChunks.map((m) => (
                      <div
                        key={m.label + m.days[0]!.toISOString()}
                        className="flex shrink-0 items-center justify-center border-b border-r border-[#e8e8e8] text-[11px] font-medium capitalize text-[#9ca3af]"
                        style={{ width: m.days.length * pixelsPerDay }}
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                  <div className="flex h-[22px]">
                    {days.map((d) => (
                      <div
                        key={d.toISOString()}
                        className="flex shrink-0 items-center justify-center border-r border-[#e8e8e8] text-[11px] text-[#9ca3af]"
                        style={{ width: pixelsPerDay }}
                      >
                        {format(d, "d.", { locale: da })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              ref={rightBodyRef}
              onScroll={onRightScroll}
              className="overflow-y-auto"
              style={{ maxHeight: "min(516px, calc(100vh - 280px))" }}
            >
              {level === 1 &&
                projectLayouts.map(({ project: p, layout, color }) => (
                  <div
                    key={p.id}
                    className="relative border-b border-[#e8e8e8]"
                    style={{ height: ROW_H, width: totalWidth }}
                  >
                    <div className="absolute inset-0 flex">
                      {days.map((d) => (
                        <div
                          key={d.toISOString()}
                          className={`shrink-0 border-r border-[#f3f4f6] ${
                            isSameDay(d, new Date())
                              ? "bg-[#f0f6ff]"
                              : ""
                          }`}
                          style={{ width: pixelsPerDay }}
                        />
                      ))}
                    </div>
                    {todayIdx >= 0 ? (
                      <div
                        className="pointer-events-none absolute bottom-0 top-0 z-[1] w-px bg-[#1a3167]"
                        style={{ left: todayIdx * pixelsPerDay }}
                      />
                    ) : null}
                    {layout ? (
                      <div
                        className="pointer-events-none absolute inset-0 z-[2] flex items-center"
                        style={{ paddingLeft: 0 }}
                      >
                        <div
                          className="absolute flex max-w-full items-center overflow-hidden text-[11px] font-semibold text-white"
                          style={{
                            left: layout.left,
                            width: layout.width,
                            height: BAR_H,
                            top: (ROW_H - BAR_H) / 2,
                            backgroundColor: color,
                            borderRadius: 4,
                            paddingLeft: 6,
                            paddingRight: 6,
                          }}
                        >
                          {layout.width >= 60 ? (
                            <span className="truncate">{p.name}</span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}

              {level === 2 &&
                taskLayouts.map(({ task: t, layout, color }) => (
                  <div
                    key={t.id}
                    className="relative border-b border-[#e8e8e8]"
                    style={{ height: ROW_H, width: totalWidth }}
                  >
                    <div className="absolute inset-0 flex">
                      {days.map((d) => (
                        <div
                          key={d.toISOString()}
                          className={`shrink-0 border-r border-[#f3f4f6] ${
                            isSameDay(d, new Date())
                              ? "bg-[#f0f6ff]"
                              : ""
                          }`}
                          style={{ width: pixelsPerDay }}
                        />
                      ))}
                    </div>
                    {todayIdx >= 0 ? (
                      <div
                        className="pointer-events-none absolute bottom-0 top-0 z-[1] w-px bg-[#1a3167]"
                        style={{ left: todayIdx * pixelsPerDay }}
                      />
                    ) : null}
                    {layout ? (
                      <div className="pointer-events-none absolute inset-0 z-[2] flex items-center">
                        <div
                          className="absolute flex max-w-full items-center overflow-hidden text-[11px] font-semibold text-white"
                          style={{
                            left: layout.left,
                            width: layout.width,
                            height: BAR_H,
                            top: (ROW_H - BAR_H) / 2,
                            backgroundColor: color,
                            borderRadius: 4,
                            paddingLeft: 6,
                            paddingRight: 6,
                          }}
                        >
                          {layout.width >= 60 ? (
                            <span className="truncate">{t.title}</span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}

              {level === 2 && tasksLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="relative border-b border-[#e8e8e8]"
                      style={{ height: ROW_H, width: totalWidth }}
                    >
                      <div className="absolute inset-0 flex">
                        {days.map((d) => (
                          <div
                            key={d.toISOString()}
                            className={`shrink-0 border-r border-[#f3f4f6] ${
                              isSameDay(d, new Date())
                                ? "bg-[#f0f6ff]"
                                : ""
                            }`}
                            style={{ width: pixelsPerDay }}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
