"use client";

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { da } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MeetingModal } from "@/components/calendar/MeetingModal";
import { MeetingSidePanel } from "@/components/kalender/MeetingSidePanel";
import type { CalendarMeetingDTO, CalendarProjectOption } from "@/types/calendar";

type ViewMode = "week" | "month";

const TZ_DISPLAY = "da-DK";

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function dayKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseTimeToMin(t: string | null | undefined): number | null {
  if (!t?.trim()) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Week time grid: 07:00–20:00, 13 hour rows × 48px = 624px */
const FIRST_HOUR = 7;
const LAST_HOUR = 20;
const HOUR_ROW_PX = 48;
const TIME_AXIS_W = 48;
const ALL_DAY_H = 32;
const DAY_START_MIN = FIRST_HOUR * 60;
const DAY_END_MIN = LAST_HOUR * 60;
const TIME_GRID_PX = (LAST_HOUR - FIRST_HOUR) * HOUR_ROW_PX;

function minutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function meetingTimedStyle(m: CalendarMeetingDTO): CSSProperties {
  const start = parseTimeToMin(m.startTime);
  const endM = parseTimeToMin(m.endTime);
  if (start == null) {
    return {};
  }
  const end = endM ?? start + 60;
  const visStart = Math.max(start, DAY_START_MIN);
  const visEnd = Math.min(end, DAY_END_MIN);
  if (visEnd <= visStart) {
    return { display: "none" };
  }
  const top = ((visStart - DAY_START_MIN) / 60) * HOUR_ROW_PX;
  const height = Math.max(24, ((visEnd - visStart) / 60) * HOUR_ROW_PX);
  return {
    position: "absolute",
    top,
    height,
    left: 4,
    right: 4,
  };
}

function formatRowWhen(m: CalendarMeetingDTO): string {
  const d = new Date(m.date);
  const dayStr = format(d, "EEE d. MMM", { locale: da });
  const st = m.startTime?.trim();
  const en = m.endTime?.trim();
  let time = "Hele dagen";
  if (st && en) time = `${st}–${en}`;
  else if (st) time = st;
  return `${dayStr} · ${time}`;
}

function upcomingSorted(meetings: CalendarMeetingDTO[]): CalendarMeetingDTO[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return [...meetings]
    .filter((m) => {
      const d = new Date(m.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= now.getTime();
    })
    .sort((a, b) => {
      const da = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (da !== 0) return da;
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    })
    .slice(0, 10);
}

type Props = {
  meetings: CalendarMeetingDTO[];
  projects: CalendarProjectOption[];
  currentUserId: string;
};

export default function KalenderPageClient({
  meetings,
  projects,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [monthPickDay, setMonthPickDay] = useState<Date | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);
  const [panelMeetingId, setPanelMeetingId] = useState<string | null>(null);
  const [panelInitial, setPanelInitial] = useState<CalendarMeetingDTO | null>(
    null,
  );

  const weekScrollRef = useRef<HTMLDivElement>(null);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    if (view !== "week") return;
    const id = window.setInterval(() => setNowTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [view]);

  useEffect(() => {
    if (view !== "week") return;
    const el = weekScrollRef.current;
    if (!el) return;
    const raf = window.requestAnimationFrame(() => {
      el.scrollTop = HOUR_ROW_PX;
    });
    return () => window.cancelAnimationFrame(raf);
  }, [view, anchor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const monthGrid = useMemo(() => {
    const sm = startOfMonth(anchor);
    const em = endOfMonth(anchor);
    const start = startOfWeek(sm, { weekStartsOn: 1 });
    const end = endOfWeek(em, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [anchor]);

  const meetingsByDay = useMemo(() => {
    const m = new Map<string, CalendarMeetingDTO[]>();
    for (const e of meetings) {
      const local = new Date(e.date);
      const dk = dayKeyLocal(local);
      if (!m.has(dk)) m.set(dk, []);
      m.get(dk)!.push(e);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    }
    return m;
  }, [meetings]);

  const listUpcoming = useMemo(() => upcomingSorted(meetings), [meetings]);

  const headerLabel = format(anchor, "MMMM yyyy", { locale: da });

  const goToday = () => {
    setAnchor(new Date());
    setMonthPickDay(null);
  };

  const openCreate = (pid?: string | null) => {
    setDefaultProjectId(pid ?? null);
    setCreateModalOpen(true);
  };

  const openMeetingPanel = (m: CalendarMeetingDTO) => {
    setPanelInitial(m);
    setPanelMeetingId(m.id);
  };

  const closeMeetingPanel = () => {
    setPanelMeetingId(null);
    setPanelInitial(null);
    router.refresh();
  };

  const onSaved = useCallback(() => {
    router.refresh();
  }, [router]);

  const today = new Date();
  const todayKey = dayKeyLocal(today);

  const nowLineTopPx = useMemo(() => {
    const now = new Date();
    const m = minutesFromMidnight(now);
    if (m < DAY_START_MIN || m > DAY_END_MIN) return null;
    return ((m - DAY_START_MIN) / 60) * HOUR_ROW_PX;
  }, [nowTick, view]);

  const hourLabels = useMemo(
    () =>
      Array.from(
        { length: LAST_HOUR - FIRST_HOUR },
        (_, i) => FIRST_HOUR + i,
      ),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setAnchor((a) =>
                view === "week" ? addDays(a, -7) : subMonths(a, 1),
              )
            }
            className="rounded-lg border border-outline-variant/20 p-2"
            aria-label="Forrige"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[10rem] text-center capitalize text-sm font-semibold text-[#0f1923]">
            {headerLabel}
          </span>
          <button
            type="button"
            onClick={() =>
              setAnchor((a) =>
                view === "week" ? addDays(a, 7) : addMonths(a, 1),
              )
            }
            className="rounded-lg border border-outline-variant/20 p-2"
            aria-label="Næste"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-[#1a3167] px-3 py-1.5 text-sm font-medium text-[#1a3167]"
          >
            I dag
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-outline-variant/20 p-0.5">
            <button
              type="button"
              onClick={() => setView("week")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                view === "week"
                  ? "bg-[#1a3167] text-white"
                  : "text-on-surface-variant"
              }`}
            >
              Uge
            </button>
            <button
              type="button"
              onClick={() => setView("month")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                view === "month"
                  ? "bg-[#1a3167] text-white"
                  : "text-on-surface-variant"
              }`}
            >
              Måned
            </button>
          </div>
          <button
            type="button"
            onClick={() => openCreate()}
            className="rounded-lg bg-[#1a3167] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Nyt møde
          </button>
        </div>
      </div>

      {view === "week" ? (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/20 bg-white">
          <div className="min-w-[720px]">
            <div className="sticky top-0 z-20 bg-white">
              <div className="flex border-b border-[#e8e8e8]">
                <div
                  className="shrink-0 border-r border-[#e8e8e8] bg-white"
                  style={{ width: TIME_AXIS_W }}
                />
                {weekDays.map((d) => {
                  const key = dayKeyLocal(d);
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={`h-${key}`}
                      className={`min-w-0 flex-1 border-r border-[#e8e8e8] px-1 py-2 text-center last:border-r-0 ${
                        isToday ? "border-t-2 border-t-[#1a3167] bg-[#f0f6ff]" : ""
                      }`}
                    >
                      <span className="whitespace-pre-line text-[11px] font-semibold uppercase text-[#6b7280]">
                        {`${format(d, "EEE", { locale: da })}\n${d.getDate()}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div
                className="flex border-b border-[#e8e8e8] bg-white"
                style={{ minHeight: ALL_DAY_H }}
              >
                <div
                  className="flex shrink-0 items-center justify-end border-r border-[#e8e8e8] pr-2 text-[10px] text-[#9ca3af]"
                  style={{ width: TIME_AXIS_W }}
                >
                  Hele dagen
                </div>
                {weekDays.map((d) => {
                  const key = dayKeyLocal(d);
                  const dayMeetings = meetingsByDay.get(key) ?? [];
                  const allDay = dayMeetings.filter((m) => !m.startTime?.trim());
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={`ad-${key}`}
                      className={`min-w-0 flex-1 border-r border-[#e8e8e8] px-1 py-0.5 last:border-r-0 ${
                        isToday ? "bg-[#f0f6ff]" : ""
                      }`}
                    >
                      <div className="flex flex-wrap gap-0.5">
                        {allDay.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => openMeetingPanel(m)}
                            className="max-w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium text-white"
                            style={{
                              backgroundColor: m.project?.color ?? "#1a3167",
                              borderRadius: 4,
                            }}
                            title={m.title}
                          >
                            {m.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              ref={weekScrollRef}
              className="max-h-[min(70vh,820px)] overflow-y-auto overflow-x-hidden"
            >
              <div className="flex">
                <div
                  className="shrink-0 border-r border-[#e8e8e8] bg-white"
                  style={{ width: TIME_AXIS_W }}
                >
                  <div style={{ height: TIME_GRID_PX }}>
                    {hourLabels.map((h) => (
                      <div
                        key={h}
                        className="flex items-start justify-end pr-2 text-[11px] font-normal text-[#9ca3af]"
                        style={{ height: HOUR_ROW_PX }}
                      >
                        {pad2(h)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid min-w-0 flex-1 grid-cols-7">
                  {weekDays.map((d) => {
                    const key = dayKeyLocal(d);
                    const dayMeetings = meetingsByDay.get(key) ?? [];
                    const timed = dayMeetings.filter((m) => m.startTime?.trim());
                    const isToday = key === todayKey;
                    return (
                      <div
                        key={key}
                        className={`relative border-r border-[#e8e8e8] last:border-r-0 ${
                          isToday ? "bg-[#f0f6ff]" : ""
                        }`}
                        style={{ height: TIME_GRID_PX }}
                      >
                        {Array.from(
                          { length: LAST_HOUR - FIRST_HOUR + 1 },
                          (_, i) => (
                            <div
                              key={i}
                              className="pointer-events-none absolute left-0 right-0 border-t border-[#f3f4f6]"
                              style={{ top: i * HOUR_ROW_PX }}
                            />
                          ),
                        )}

                        {isToday && nowLineTopPx != null ? (
                          <div
                            className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-[#1a3167]"
                            style={{ top: nowLineTopPx }}
                          />
                        ) : null}

                        {timed.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => openMeetingPanel(m)}
                            className="z-10 overflow-hidden text-left text-[12px] font-medium leading-tight text-white"
                            style={{
                              ...meetingTimedStyle(m),
                              backgroundColor: m.project?.color ?? "#1a3167",
                              borderRadius: 4,
                              padding: "4px 8px",
                            }}
                          >
                            <span className="line-clamp-2">{m.title}</span>
                            <span className="block text-[10px] opacity-90">
                              {m.startTime}
                              {m.endTime ? `–${m.endTime}` : ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-outline-variant/20 bg-white p-2">
            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[#9ca3af]">
              {["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"].map((x) => (
                <div key={x}>{x}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map((d) => {
                const key = dayKeyLocal(d);
                const dm = meetingsByDay.get(key) ?? [];
                const inMonth = isSameMonth(d, anchor);
                const pills = dm.slice(0, 3);
                const more = dm.length - 3;
                const sel =
                  monthPickDay && isSameDay(d, monthPickDay) ? "ring-2 ring-[#1a3167]" : "";
                return (
                  <button
                    key={`${key}-${d.getTime()}`}
                    type="button"
                    onClick={() => setMonthPickDay(d)}
                    className={`min-h-[88px] rounded border p-1 text-left text-[11px] ${inMonth ? "border-[#e8e8e8] bg-white" : "border-transparent bg-[#f8f9fa] text-[#9ca3af]"} ${sel}`}
                  >
                    <span className="font-semibold">{d.getDate()}</span>
                    <div className="mt-1 space-y-0.5">
                      {pills.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            openMeetingPanel(m);
                          }}
                          className="block w-full truncate rounded-full px-1.5 py-0.5 text-left text-[9px] font-medium text-white"
                          style={{
                            backgroundColor: m.project?.color ?? "#1a3167",
                          }}
                          title={m.title}
                        >
                          {m.title}
                        </button>
                      ))}
                      {more > 0 ? (
                        <span className="text-[9px] text-[#6b7280]">+{more} flere</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {monthPickDay ? (
            <div className="rounded-xl border border-outline-variant/20 bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-[#0f1923]">
                {format(monthPickDay, "EEEE d. MMMM", { locale: da })}
              </p>
              <ul className="space-y-2">
                {(meetingsByDay.get(dayKeyLocal(monthPickDay)) ?? []).map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => openMeetingPanel(m)}
                      className="flex w-full items-center justify-between rounded-lg border border-[#e8e8e8] px-3 py-2 text-left hover:bg-[#f8f9fa]"
                    >
                      <span className="font-medium text-[#0f1923]">{m.title}</span>
                      <span className="text-xs text-[#6b7280]">
                        {m.startTime ?? "Hele dagen"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#0f1923]">Kommende møder</h2>
        <div className="rounded-xl border border-outline-variant/20 bg-white">
          {listUpcoming.length === 0 ? (
            <p className="p-4 text-sm text-[#6b7280]">Ingen kommende møder.</p>
          ) : (
            <ul className="divide-y divide-[#f3f4f6]">
              {listUpcoming.map((m) => (
                <li
                  key={m.id}
                  className="group flex items-center gap-3 px-4 py-3"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: m.project?.color ?? "#1a3167" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-[#6b7280]">{formatRowWhen(m)}</p>
                    <p className="text-[13px] font-medium text-[#0f1923]">{m.title}</p>
                    {m.project ? (
                      <span
                        className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                        style={{ backgroundColor: m.project.color }}
                      >
                        {m.project.name}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => openMeetingPanel(m)}
                    className="shrink-0 rounded p-1 text-[#9ca3af] opacity-0 hover:bg-[#f3f4f6] group-hover:opacity-100"
                    aria-label="Rediger"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <MeetingModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        mode="create"
        initial={null}
        defaultProjectId={defaultProjectId}
        projects={projects}
        onSaved={() => {
          setCreateModalOpen(false);
          onSaved();
        }}
      />

      <MeetingSidePanel
        open={panelMeetingId != null}
        meetingId={panelMeetingId}
        initialRow={panelInitial}
        projects={projects}
        currentUserId={currentUserId}
        onClose={closeMeetingPanel}
        onRefresh={onSaved}
      />
    </div>
  );
}
