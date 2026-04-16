"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import { Calendar, ClipboardList } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { setFocusProject as persistFocusProject } from "@/app/(dashboard)/oversigt/focus-actions";
import {
  BADGE_CHIP_CLASS,
  priorityBadgeClass,
  priorityLabelDa,
  statusBadgeClass,
  statusLabelDa,
} from "@/components/projekter/project-helpers";
import { formatDanishDate, formatOversigtTaskDeadline } from "@/lib/datetime/format-danish";
import { stripHtmlForDisplay } from "@/lib/richtext/note-html";
import type {
  OversigtActivityItem,
  OversigtDeadlineItem,
  OversigtFocusProjectCard,
  OversigtFocusSuggestion,
  OversigtMeetingItem,
  OversigtPulseProject,
  OversigtTaskRow,
} from "@/types/oversigt";
import { DagensFocusCard } from "@/components/oversigt/DagensFocusCard";
import { FocusPicker } from "@/components/oversigt/FocusPicker";

function upcomingDeadlinePresentation(deadlineIso: string | null): {
  label: string;
  color: string;
} {
  if (!deadlineIso) return { label: "Ingen frist", color: "#9ca3af" };
  const d = startOfDay(new Date(deadlineIso));
  const today = startOfDay(new Date());
  const diff = differenceInCalendarDays(d, today);
  const label = formatOversigtTaskDeadline(deadlineIso);
  if (diff < 0 || diff === 0) return { label, color: "#dc2626" };
  if (diff <= 7) return { label, color: "#d97706" };
  return { label, color: "#16a34a" };
}

/** Næste deadlines — relative suffix after date. */
function deadlineRelativeSuffix(deadlineIso: string): { text: string; className: string } {
  const d = startOfDay(new Date(deadlineIso));
  const today = startOfDay(new Date());
  const diff = differenceInCalendarDays(d, today);
  if (diff < 0) return { text: "Overskredet", className: "text-[#dc2626]" };
  if (diff === 0) return { text: "I dag", className: "text-[#dc2626]" };
  if (diff <= 7) return { text: `${diff} dage`, className: "text-[#d97706]" };
  return { text: `${diff} dage`, className: "text-[#9ca3af]" };
}

/** Projektpuls FRIST column — date + " · X dage" (suffix in #6b7280). */
function pulseFristParts(deadlineIso: string | null): {
  overdue: boolean;
  dateStr: string | null;
  suffix: string | null;
} {
  if (!deadlineIso) return { overdue: false, dateStr: null, suffix: null };
  const d = startOfDay(new Date(deadlineIso));
  const today = startOfDay(new Date());
  const diff = differenceInCalendarDays(d, today);
  if (diff < 0) return { overdue: true, dateStr: null, suffix: null };
  const dayWord = diff === 1 ? "1 dag" : `${diff} dage`;
  return {
    overdue: false,
    dateStr: formatDanishDate(deadlineIso),
    suffix: ` · ${dayWord}`,
  };
}

function truncChars(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function activitySnippet(htmlOrPlain: string): string {
  const plain = stripHtmlForDisplay(htmlOrPlain);
  return truncChars(plain, 60);
}

function formatActivityRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const dayDiff = differenceInCalendarDays(startOfDay(now), startOfDay(d));
  const ms = now.getTime() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (dayDiff === 0) {
    if (mins < 1) return "lige nu";
    if (mins < 60) return `${mins} min. siden`;
    const hrs = Math.floor(ms / 3600000);
    return `${hrs} timer siden`;
  }
  if (dayDiff === 1) return "i går";
  return format(d, "d. MMM", { locale: da }).replace(/\u00a0/g, " ");
}

type Props = {
  greeting: string;
  dateLine: string;
  tasks: OversigtTaskRow[];
  pulseProjects: OversigtPulseProject[];
  deadlines: OversigtDeadlineItem[];
  meetings: OversigtMeetingItem[];
  recentActivity: OversigtActivityItem[];
  focusProject: OversigtFocusProjectCard | null;
  focusSuggestions: OversigtFocusSuggestion[];
  focusAutoSelectedId: string | null;
  isFocusSetToday: boolean;
  focusPickerTodayLabel: string;
  focusPickerDisplayName: string;
};

export default function OversigtPageClient({
  greeting,
  dateLine,
  tasks: initialTasks,
  pulseProjects,
  deadlines,
  meetings,
  recentActivity,
  focusProject: initialFocusProject,
  focusSuggestions,
  focusAutoSelectedId,
  isFocusSetToday,
  focusPickerTodayLabel,
  focusPickerDisplayName,
}: Props) {
  const router = useRouter();
  const [focusProject, setFocusProject] = useState<OversigtFocusProjectCard | null>(
    initialFocusProject,
  );
  const morningPickerDismissedRef = useRef(false);
  const hasActiveProjects = focusSuggestions.length > 0;
  const [pickerOpen, setPickerOpen] = useState(
    () => !isFocusSetToday && hasActiveProjects,
  );

  useEffect(() => {
    setFocusProject(initialFocusProject);
  }, [initialFocusProject]);

  useEffect(() => {
    if (!hasActiveProjects) {
      setPickerOpen(false);
      return;
    }
    if (!isFocusSetToday && !morningPickerDismissedRef.current) {
      setPickerOpen(true);
    }
  }, [isFocusSetToday, hasActiveProjects]);

  const applyFocus = useCallback(
    async (projectId: string) => {
      await persistFocusProject(projectId);
      setPickerOpen(false);
      morningPickerDismissedRef.current = false;
      router.refresh();
    },
    [router],
  );

  const navigateToTask = useCallback(
    (task: OversigtTaskRow) => {
      router.push(`/projekter/${task.projectId}?taskId=${task.id}`);
    },
    [router],
  );

  const navigateActivity = useCallback(
    (a: OversigtActivityItem) => {
      if (a.projectId) {
        router.push(`/projekter/${a.projectId}?tab=aktivitet`);
        return;
      }
      router.push("/kalender");
    },
    [router],
  );

  const sectionLabelClass =
    "mb-2 font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant";

  return (
    <div className="min-w-0 pb-10">
      {hasActiveProjects ? (
        <FocusPicker
          open={pickerOpen}
          displayName={focusPickerDisplayName}
          todayLabel={focusPickerTodayLabel}
          suggestions={focusSuggestions}
          autoSelectedId={focusAutoSelectedId}
          onClose={() => setPickerOpen(false)}
          onConfirm={applyFocus}
        />
      ) : null}

      <header className="mb-8">
        <h1 className="font-headline text-[20px] font-semibold leading-tight text-primary">
          {greeting}
        </h1>
        <p className="mt-1 font-body text-[13px] text-on-surface-variant">{dateLine}</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr] lg:gap-5">
        {/* Left 60% */}
        <div className="min-w-0 space-y-5">
          <DagensFocusCard
            focusProject={focusProject}
            hasActiveProjects={hasActiveProjects}
            onShiftFocus={() => setPickerOpen(true)}
          />

          <section>
            <h2 className={sectionLabelClass}>Kommende opgaver</h2>
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm ring-1 ring-black/[0.03]">
              {initialTasks.length === 0 ? (
                <p className="px-4 py-4 text-center font-body text-[13px] italic text-[#9ca3af]">
                  Ingen kommende opgaver
                </p>
              ) : (
                <>
                  <div
                    className="flex items-center border-b border-t border-[#e8e8e8] bg-[#f8f9fa] px-4 py-2"
                    role="row"
                    aria-hidden
                  >
                    <span className="min-w-0 flex-1 font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                      Opgave
                    </span>
                    <span className="w-[160px] min-w-[160px] shrink-0 text-right font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                      Projekt
                    </span>
                    <span className="w-[100px] min-w-[100px] shrink-0 text-right font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                      Frist
                    </span>
                    <span className="ml-3 w-[80px] min-w-[80px] shrink-0 text-right font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                      Prioritet
                    </span>
                  </div>
                  <ul>
                    {initialTasks.map((task) => {
                      const dl = upcomingDeadlinePresentation(task.deadline);
                      return (
                        <li key={task.id} className="border-b border-[#f3f4f6] last:border-b-0">
                          <button
                            type="button"
                            onClick={() => navigateToTask(task)}
                            className="flex h-11 w-full cursor-pointer items-center px-4 text-left transition-colors hover:bg-[#f8f9fa]"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              <span
                                className="h-[10px] w-[10px] shrink-0 rounded-full"
                                style={{ backgroundColor: task.projectColor }}
                                aria-hidden
                              />
                              <span className="min-w-0 truncate font-body text-[13px] font-medium text-[#0f1923]">
                                {task.title}
                              </span>
                            </div>
                            <span className="w-[160px] min-w-[160px] shrink-0 truncate text-right font-body text-[12px] text-[#9ca3af]">
                              {task.projectName}
                            </span>
                            <span
                              className="w-[100px] min-w-[100px] shrink-0 whitespace-nowrap text-right font-body text-[12px] tabular-nums"
                              style={{ color: dl.color }}
                            >
                              {dl.label}
                            </span>
                            <div className="ml-3 flex w-[80px] min-w-[80px] shrink-0 justify-end">
                              <span
                                className={`${BADGE_CHIP_CLASS} shrink-0 scale-90 py-0 text-[10px] ${priorityBadgeClass(task.priority)}`}
                              >
                                {priorityLabelDa(task.priority)}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </section>

          <section>
            <h2 className={sectionLabelClass}>Projektpuls</h2>
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm ring-1 ring-black/[0.03] overflow-hidden">
              {pulseProjects.length === 0 ? (
                <p className="px-4 py-6 text-sm text-on-surface-variant/90">
                  Ingen projekter endnu.
                </p>
              ) : (
                <table className="w-full table-fixed border-collapse">
                  <thead>
                    <tr className="border-y border-[#e8e8e8] bg-[#f8f9fa]">
                      <th className="px-4 py-2 text-left font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                        PROJEKT
                      </th>
                      <th className="w-[112px] px-4 py-2 text-left font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                        STATUS
                      </th>
                      <th className="w-[148px] px-4 py-2 text-left font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                        FREMDRIFT
                      </th>
                      <th className="min-w-[200px] px-4 py-2 text-right font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
                        FRIST
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pulseProjects.map((p) => {
                      const frist = pulseFristParts(p.deadline);
                      return (
                        <tr
                          key={p.id}
                          className="h-12 cursor-pointer border-b border-[#f3f4f6] transition-colors last:border-b-0 hover:bg-[#f8f9fa]"
                          onClick={() => router.push(`/projekter/${p.id}`)}
                        >
                          <td className="px-4 align-middle">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: p.color }}
                                aria-hidden
                              />
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1a3167] text-[11px] font-bold text-white">
                                {p.initials}
                              </span>
                              <span className="min-w-0 truncate font-body text-[13px] font-medium text-[#0f1923]">
                                {p.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 align-middle">
                            <span
                              className={`${BADGE_CHIP_CLASS} inline-flex ${statusBadgeClass(p.status)}`}
                            >
                              {statusLabelDa(p.status)}
                            </span>
                          </td>
                          <td className="px-4 align-middle">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-[#e8e8e8]">
                                <div
                                  className="h-full rounded-full bg-[#1a3167]"
                                  style={{ width: `${p.progress}%` }}
                                />
                              </div>
                              <span className="font-body text-[12px] tabular-nums text-[#6b7280]">
                                {p.progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 text-right align-middle">
                            {frist.overdue ? (
                              <span className="font-body text-[12px] text-[#dc2626]">Overskredet</span>
                            ) : frist.dateStr ? (
                              <span className="font-body text-[12px]">
                                <span className="text-[#0f1923]">{frist.dateStr}</span>
                                <span className="text-[#6b7280]">{frist.suffix}</span>
                              </span>
                            ) : (
                              <span className="font-body text-[12px] text-[#9ca3af]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        {/* Right 40% */}
        <div className="min-w-0 space-y-5">
          <section>
            <h2 className={sectionLabelClass}>Næste deadlines</h2>
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm ring-1 ring-black/[0.03]">
              {deadlines.length === 0 ? (
                <p className="text-sm text-on-surface-variant/90">Ingen kommende deadlines.</p>
              ) : (
                <ul className="space-y-4">
                  {deadlines.map((d) => {
                    const rel = deadlineRelativeSuffix(d.deadline);
                    return (
                      <li key={d.id} className="flex gap-3">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: d.dotColor }}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-body text-sm font-semibold text-on-surface">
                            <span>{formatDanishDate(d.deadline)}</span>
                            <span className={`font-medium ${rel.className}`}> · {rel.text}</span>
                          </p>
                          <p className="mt-0.5 font-body text-[13px] text-on-surface-variant">
                            {d.title}
                          </p>
                          <Link
                            href={`/projekter/${d.projectId}`}
                            className="mt-1 inline-block font-body text-[11px] font-semibold text-primary hover:underline"
                          >
                            {d.projectName}
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h2 className={sectionLabelClass}>Kommende møder</h2>
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm ring-1 ring-black/[0.03]">
              {meetings.length === 0 ? (
                <p className="text-sm text-on-surface-variant/90">Ingen kommende møder.</p>
              ) : (
                <ul className="space-y-4">
                  {meetings.map((m) => (
                    <li key={m.id} className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-body text-sm font-bold text-on-surface">
                          {m.timeLabel}
                        </span>
                        <span className="font-body text-[13px] font-medium text-[#0f1923]">{m.title}</span>
                      </div>
                      {m.projectId && m.projectName && m.projectColor ? (
                        <span
                          className="inline-flex w-fit max-w-full truncate rounded-[4px] border bg-white px-2 py-0.5 font-body text-[11px] font-semibold"
                          style={{
                            borderColor: m.projectColor,
                            color: m.projectColor,
                          }}
                        >
                          {m.projectName}
                        </span>
                      ) : m.projectId && m.projectName ? (
                        <span className="inline-flex w-fit max-w-full truncate rounded-[4px] border border-[#1a3167] bg-white px-2 py-0.5 font-body text-[11px] font-semibold text-[#1a3167]">
                          {m.projectName}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h2 className={sectionLabelClass}>Seneste aktivitet</h2>
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm ring-1 ring-black/[0.03]">
              {recentActivity.length === 0 ? (
                <p className="font-body text-[13px] italic text-[#9ca3af]">Ingen aktivitet endnu.</p>
              ) : (
                <ul className="space-y-3">
                  {recentActivity.map((a) => {
                    const fromTask = Boolean(a.taskId && a.taskTitle);
                    const titleSrc = fromTask ? a.taskTitle! : a.meetingTitle ?? "";
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => navigateActivity(a)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            {fromTask ? (
                              <span className="inline-flex max-w-[70%] items-center gap-1 rounded-[3px] bg-[#f0f6ff] px-1.5 py-0.5 font-body text-[11px] font-medium text-[#1a3167]">
                                <ClipboardList className="h-2.5 w-2.5 shrink-0" aria-hidden />
                                <span className="truncate">{truncChars(titleSrc, 20)}</span>
                              </span>
                            ) : (
                              <span className="inline-flex max-w-[70%] items-center gap-1 rounded-[3px] bg-[#f0f9ff] px-1.5 py-0.5 font-body text-[11px] font-medium text-[#0ea5e9]">
                                <Calendar className="h-2.5 w-2.5 shrink-0" aria-hidden />
                                <span className="truncate">{truncChars(titleSrc, 20)}</span>
                              </span>
                            )}
                            <span className="shrink-0 whitespace-nowrap font-body text-[11px] text-[#9ca3af]">
                              {formatActivityRelative(a.createdAt)}
                            </span>
                          </div>
                          {a.projectName ? (
                            <div className="mt-1 flex min-w-0 items-center gap-1.5">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: a.projectColor ?? "#9ca3af",
                                }}
                                aria-hidden
                              />
                              <span className="min-w-0 truncate font-body text-[11px] text-[#6b7280]">
                                {a.projectName}
                              </span>
                            </div>
                          ) : null}
                          <p className="mt-0.5 font-body text-[13px] leading-[1.5] text-[#6b7280]">
                            {activitySnippet(a.content)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
