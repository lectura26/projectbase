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
  isMonday,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { da } from "date-fns/locale";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
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
const HEADER_H = 52;

const DAY_COL_W = 40;
const WEEK_COL_W = 120;
const MONTH_COL_W = 160;

/** 60 days: 30 before + 30 after center (center at day index 30). */
const DAY_RANGE_BEFORE = 30;
const DAY_RANGE_AFTER = 29;
const DAY_TOTAL = 60;

const WEEK_HALF = 13;
const WEEK_TOTAL = 26;

const MONTH_HALF = 12;
const MONTH_TOTAL = 24;

const PX_PER_DAY_IN_WEEK = WEEK_COL_W / 7;

function monthPixelAtDayStart(sod: Date, firstMonthInTimeline: Date): number {
  let px = 0;
  let monthIter = startOfMonth(firstMonthInTimeline);
  const targetMonth = startOfMonth(sod);
  while (monthIter < targetMonth) {
    px += MONTH_COL_W;
    monthIter = addMonths(monthIter, 1);
  }
  const dim =
    differenceInCalendarDays(endOfMonth(sod), startOfMonth(sod)) + 1;
  const dayNum = sod.getDate();
  px += ((dayNum - 1) / dim) * MONTH_COL_W;
  return px;
}

/** Exclusive end pixel (start of day after `be`). */
function monthPixelAfterLastDay(be: Date, firstMonthInTimeline: Date): number {
  return monthPixelAtDayStart(addDays(startOfDay(be), 1), firstMonthInTimeline);
}

function clampBar(
  left: number,
  width: number,
  totalWidth: number,
): { left: number; width: number } | null {
  const right = left + width;
  if (right <= 0 || left >= totalWidth) return null;
  const clampedLeft = Math.max(0, left);
  const clampedRight = Math.min(totalWidth, right);
  const w = Math.max(4, clampedRight - clampedLeft);
  return { left: clampedLeft, width: w };
}

function barLayoutForZoom(
  barStart: Date,
  barEnd: Date,
  zoom: Zoom,
  centerDate: Date,
  totalWidth: number,
  firstMonth: Date,
  weekViewStartMonday: Date,
): { left: number; width: number } | null {
  const bs = startOfDay(barStart);
  const be = startOfDay(barEnd);
  const c = startOfDay(centerDate);

  if (zoom === "day") {
    const vs = addDays(c, -DAY_RANGE_BEFORE);
    const left = differenceInCalendarDays(bs, vs) * DAY_COL_W;
    const w = (differenceInCalendarDays(be, bs) + 1) * DAY_COL_W;
    return clampBar(left, w, totalWidth);
  }

  if (zoom === "week") {
    const vs = weekViewStartMonday;
    const left = differenceInCalendarDays(bs, vs) * PX_PER_DAY_IN_WEEK;
    const w = (differenceInCalendarDays(be, bs) + 1) * PX_PER_DAY_IN_WEEK;
    return clampBar(left, w, totalWidth);
  }

  const left = monthPixelAtDayStart(bs, firstMonth);
  const endPx = monthPixelAfterLastDay(be, firstMonth);
  return clampBar(left, endPx - left, totalWidth);
}

function pixelForDateOnTimeline(
  d: Date,
  zoom: Zoom,
  centerDate: Date,
  firstMonth: Date,
  weekViewStartMonday: Date,
): number {
  const sod = startOfDay(d);
  const c = startOfDay(centerDate);
  if (zoom === "day") {
    const vs = addDays(c, -DAY_RANGE_BEFORE);
    return differenceInCalendarDays(sod, vs) * DAY_COL_W;
  }
  if (zoom === "week") {
    return differenceInCalendarDays(sod, weekViewStartMonday) * PX_PER_DAY_IN_WEEK;
  }
  return monthPixelAtDayStart(sod, firstMonth);
}

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

function zoomSeg(active: boolean): string {
  return `rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
    active
      ? "bg-white text-[#001533] shadow-sm"
      : "font-medium text-[#6b7280] hover:text-[#0f1923]"
  }`;
}

/** Mondays strictly inside (monthStart, monthEnd] that need a divider line. */
function mondaysForMonthOverlay(monthStart: Date): Date[] {
  const monthEnd = endOfMonth(monthStart);
  const out: Date[] = [];
  let d = monthStart;
  if (!isMonday(d)) {
    d = addDays(d, ((8 - d.getDay()) % 7) || 7);
  }
  while (d <= monthEnd) {
    if (d > monthStart) out.push(d);
    d = addWeeks(d, 1);
  }
  return out;
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
  const [centerDate, setCenterDate] = useState(() => startOfDay(new Date()));

  const leftBodyRef = useRef<HTMLDivElement>(null);
  const rightBodyRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const scrollLock = useRef(false);

  const dayViewStart = useMemo(
    () => addDays(centerDate, -DAY_RANGE_BEFORE),
    [centerDate],
  );
  const dayColumns = useMemo(
    () =>
      eachDayOfInterval({
        start: dayViewStart,
        end: addDays(dayViewStart, DAY_TOTAL - 1),
      }),
    [dayViewStart],
  );

  const weekViewStartMonday = useMemo(
    () => addWeeks(startOfWeek(centerDate, { weekStartsOn: 1 }), -WEEK_HALF),
    [centerDate],
  );

  const firstMonthInTimeline = useMemo(
    () => addMonths(startOfMonth(centerDate), -MONTH_HALF),
    [centerDate],
  );

  const monthColumns = useMemo(() => {
    const cols: { monthStart: Date; label: string }[] = [];
    let m = startOfMonth(firstMonthInTimeline);
    for (let i = 0; i < MONTH_TOTAL; i++) {
      cols.push({
        monthStart: m,
        label: format(m, "MMMM yyyy", { locale: da }),
      });
      m = addMonths(m, 1);
    }
    return cols;
  }, [firstMonthInTimeline]);

  const totalWidth = useMemo(() => {
    if (zoom === "day") return DAY_TOTAL * DAY_COL_W;
    if (zoom === "week") return WEEK_TOTAL * WEEK_COL_W;
    return MONTH_TOTAL * MONTH_COL_W;
  }, [zoom]);

  const todayPx = useMemo(() => {
    return pixelForDateOnTimeline(
      new Date(),
      zoom,
      centerDate,
      firstMonthInTimeline,
      weekViewStartMonday,
    );
  }, [zoom, centerDate, firstMonthInTimeline, weekViewStartMonday]);

  const periodLabel = useMemo(() => {
    if (zoom === "day") {
      return format(centerDate, "MMMM yyyy", { locale: da });
    }
    if (zoom === "week") {
      return `Uge ${getISOWeek(centerDate)}, ${format(centerDate, "yyyy")}`;
    }
    return format(centerDate, "MMMM yyyy", { locale: da });
  }, [zoom, centerDate]);

  useLayoutEffect(() => {
    const el = rightScrollRef.current;
    if (!el || totalWidth <= 0) return;
    const px = pixelForDateOnTimeline(
      centerDate,
      zoom,
      centerDate,
      firstMonthInTimeline,
      weekViewStartMonday,
    );
    requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, px - el.clientWidth / 2);
    });
  }, [
    zoom,
    centerDate,
    totalWidth,
    firstMonthInTimeline,
    weekViewStartMonday,
  ]);

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
      const layout = barLayoutForZoom(
        start,
        end,
        zoom,
        centerDate,
        totalWidth,
        firstMonthInTimeline,
        weekViewStartMonday,
      );
      return { project: p, layout, color: projectBarColor(p.status) };
    });
  }, [
    projects,
    zoom,
    centerDate,
    totalWidth,
    firstMonthInTimeline,
    weekViewStartMonday,
  ]);

  const taskLayouts = useMemo(() => {
    return tasks.map((t) => {
      const { start, end } = taskDateRange(t);
      const layout = barLayoutForZoom(
        start,
        end,
        zoom,
        centerDate,
        totalWidth,
        firstMonthInTimeline,
        weekViewStartMonday,
      );
      return { task: t, layout, color: taskBarColor(t.status) };
    });
  }, [
    tasks,
    zoom,
    centerDate,
    totalWidth,
    firstMonthInTimeline,
    weekViewStartMonday,
  ]);

  const handleGotoToday = () => {
    setCenterDate(startOfDay(new Date()));
  };

  const navPrev = () => {
    if (zoom === "day") setCenterDate((d) => addDays(d, -30));
    else if (zoom === "week") setCenterDate((d) => addWeeks(d, -13));
    else setCenterDate((d) => addMonths(d, -12));
  };

  const navNext = () => {
    if (zoom === "day") setCenterDate((d) => addDays(d, 30));
    else if (zoom === "week") setCenterDate((d) => addWeeks(d, 13));
    else setCenterDate((d) => addMonths(d, 12));
  };

  const onZoomChange = (z: Zoom) => {
    if (z !== zoom) setZoom(z);
  };

  const leftHeader = level === 1 ? "PROJEKT NAVN" : "OPGAVE NAVN";

  const weekHeaderCells = useMemo(() => {
    const cells: { key: string; weekLabel: string; rangeLabel: string }[] = [];
    for (let i = 0; i < WEEK_TOTAL; i++) {
      const wkStart = addWeeks(weekViewStartMonday, i);
      const wkEnd = addDays(wkStart, 6);
      cells.push({
        key: wkStart.toISOString(),
        weekLabel: `Uge ${getISOWeek(wkStart)}`,
        rangeLabel: `${format(wkStart, "d. MMM", { locale: da })} – ${format(wkEnd, "d. MMM", { locale: da })}`,
      });
    }
    return cells;
  }, [weekViewStartMonday]);

  const renderTimelineBackground = (keyPrefix: string) => {
    if (zoom === "day") {
      return (
        <div className="absolute inset-0 flex">
          {dayColumns.map((d) => (
            <div
              key={`${keyPrefix}-${d.toISOString()}`}
              className={`shrink-0 border-r border-[#e8e8e8] ${
                isSameDay(d, new Date()) ? "bg-[#f0f6ff]" : ""
              }`}
              style={{ width: DAY_COL_W }}
            />
          ))}
        </div>
      );
    }

    if (zoom === "week") {
      return (
        <div className="absolute inset-0 flex">
          {Array.from({ length: WEEK_TOTAL }).map((_, i) => (
            <div
              key={`${keyPrefix}-w-${i}`}
              className="relative shrink-0 border-r border-[#e8e8e8]"
              style={{ width: WEEK_COL_W }}
            >
              <div className="absolute inset-0 flex">
                {Array.from({ length: 7 }).map((__, j) => (
                  <div
                    key={j}
                    className={`h-full shrink-0 border-r border-[#f3f4f6] ${
                      (() => {
                        const cellDay = addDays(addWeeks(weekViewStartMonday, i), j);
                        return isSameDay(cellDay, new Date())
                          ? "bg-[#f0f6ff]"
                          : "";
                      })()
                    }`}
                    style={{ width: PX_PER_DAY_IN_WEEK }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="absolute inset-0 flex">
        {monthColumns.map(({ monthStart, label }) => {
          const monthEnd = endOfMonth(monthStart);
          const dim =
            differenceInCalendarDays(monthEnd, monthStart) + 1;
          const mondays = mondaysForMonthOverlay(monthStart);
          return (
            <div
              key={`${keyPrefix}-${label}`}
              className="relative shrink-0 border-r border-[#e8e8e8]"
              style={{ width: MONTH_COL_W }}
            >
              {Array.from({ length: dim }).map((_, dayIdx) => {
                const d = addDays(monthStart, dayIdx);
                return (
                  <div
                    key={dayIdx}
                    className={`absolute top-0 bottom-0 border-r border-[#f3f4f6] ${
                      isSameDay(d, new Date()) ? "bg-[#f0f6ff]" : ""
                    }`}
                    style={{
                      left: (dayIdx / dim) * MONTH_COL_W,
                      width: MONTH_COL_W / dim,
                    }}
                  />
                );
              })}
              {mondays.map((m) => {
                const offsetDays = differenceInCalendarDays(m, monthStart);
                const left = (offsetDays / dim) * MONTH_COL_W;
                return (
                  <div
                    key={m.toISOString()}
                    className="pointer-events-none absolute bottom-0 top-0 z-[1] w-px bg-[#f3f4f6]"
                    style={{ left }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const todayLineLeft = todayPx;

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
            onClick={() => onZoomChange("day")}
          >
            Dag
          </button>
          <button
            type="button"
            className={zoomSeg(zoom === "week")}
            onClick={() => onZoomChange("week")}
          >
            Uge
          </button>
          <button
            type="button"
            className={zoomSeg(zoom === "month")}
            onClick={() => onZoomChange("month")}
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
              style={{ width: totalWidth, minHeight: HEADER_H }}
            >
              {zoom === "day" ? (
                <div className="flex" style={{ minHeight: HEADER_H }}>
                  {dayColumns.map((d) => (
                    <div
                      key={d.toISOString()}
                      className="flex shrink-0 flex-col items-center justify-center border-r border-[#e8e8e8] px-0.5 text-center leading-tight text-[11px] font-medium text-[#9ca3af]"
                      style={{ width: DAY_COL_W, minHeight: HEADER_H }}
                    >
                      <span>
                        {format(d, "EEE", { locale: da }).toLowerCase()}.
                      </span>
                      <span>{format(d, "d.", { locale: da })}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {zoom === "week" ? (
                <div className="flex" style={{ minHeight: HEADER_H }}>
                  {weekHeaderCells.map((cell) => (
                    <div
                      key={cell.key}
                      className="flex shrink-0 flex-col items-center justify-center border-r border-[#e8e8e8] px-1 text-center text-[11px] font-medium leading-snug text-[#9ca3af]"
                      style={{ width: WEEK_COL_W, minHeight: HEADER_H }}
                    >
                      <span>{cell.weekLabel}</span>
                      <span className="mt-0.5 whitespace-nowrap text-[10px]">
                        {cell.rangeLabel}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {zoom === "month" ? (
                <div className="flex" style={{ minHeight: HEADER_H }}>
                  {monthColumns.map(({ monthStart, label }) => (
                    <div
                      key={monthStart.toISOString()}
                      className="flex shrink-0 items-center justify-center border-r border-[#e8e8e8] px-1 text-center text-[11px] font-medium capitalize leading-tight text-[#9ca3af]"
                      style={{ width: MONTH_COL_W, minHeight: HEADER_H }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div
              ref={rightBodyRef}
              onScroll={onRightScroll}
              className="overflow-y-auto"
              style={{ maxHeight: "min(508px, calc(100vh - 280px))" }}
            >
              {level === 1 &&
                projectLayouts.map(({ project: p, layout, color }) => (
                  <div
                    key={p.id}
                    className="relative border-b border-[#e8e8e8]"
                    style={{ height: ROW_H, width: totalWidth }}
                  >
                    {renderTimelineBackground(`p-${p.id}`)}
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 z-[2] w-px bg-[#1a3167]"
                      style={{ left: todayLineLeft }}
                    />
                    {layout ? (
                      <div className="pointer-events-none absolute inset-0 z-[3] flex items-center">
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
                    {renderTimelineBackground(`t-${t.id}`)}
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 z-[2] w-px bg-[#1a3167]"
                      style={{ left: todayLineLeft }}
                    />
                    {layout ? (
                      <div className="pointer-events-none absolute inset-0 z-[3] flex items-center">
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
                      {renderTimelineBackground(`sk-${i}`)}
                      <div
                        className="pointer-events-none absolute bottom-0 top-0 z-[2] w-px bg-[#1a3167]"
                        style={{ left: todayLineLeft }}
                      />
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
