"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays, startOfDay } from "date-fns";
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
import type {
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

type Props = {
  greeting: string;
  dateLine: string;
  tasks: OversigtTaskRow[];
  pulseProjects: OversigtPulseProject[];
  deadlines: OversigtDeadlineItem[];
  meetings: OversigtMeetingItem[];
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
  const [pickerOpen, setPickerOpen] = useState(
    () => !isFocusSetToday && focusSuggestions.length > 0,
  );

  useEffect(() => {
    setFocusProject(initialFocusProject);
  }, [initialFocusProject]);

  useEffect(() => {
    if (!isFocusSetToday && focusSuggestions.length > 0 && !morningPickerDismissedRef.current) {
      setPickerOpen(true);
    }
  }, [isFocusSetToday, focusSuggestions.length]);

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

  return (
    <div className="min-w-0 pb-10">
      <FocusPicker
        open={pickerOpen}
        displayName={focusPickerDisplayName}
        todayLabel={focusPickerTodayLabel}
        suggestions={focusSuggestions}
        autoSelectedId={focusAutoSelectedId}
        onClose={() => setPickerOpen(false)}
        onConfirm={applyFocus}
      />

      <header className="mb-8">
        <h1 className="font-headline text-[20px] font-semibold leading-tight text-primary">
          {greeting}
        </h1>
        <p className="mt-1 font-body text-[13px] text-on-surface-variant">{dateLine}</p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:gap-10">
        {/* Left 60% */}
        <div className="min-w-0 space-y-10">
          <DagensFocusCard
            focusProject={focusProject}
            onShiftFocus={() => setPickerOpen(true)}
          />

          <section>
            <h2 className="mb-3 font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Kommende opgaver
            </h2>
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
            <h2 className="mb-3 font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Projektpuls
            </h2>
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm ring-1 ring-black/[0.03]">
              {pulseProjects.length === 0 ? (
                <p className="px-4 py-6 text-sm text-on-surface-variant/90">
                  Ingen projekter endnu.
                </p>
              ) : (
                <ul className="divide-y divide-outline-variant/15">
                  {pulseProjects.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/projekter/${p.id}`}
                        className="flex min-h-[44px] items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-container-low/80"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-[10px] font-bold text-on-primary">
                          {p.initials}
                        </span>
                        <span
                          className="h-[10px] w-[10px] shrink-0 rounded-full"
                          style={{ backgroundColor: p.color }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 font-body text-sm font-medium text-on-surface">
                          {p.name}
                        </span>
                        <span
                          className={`${BADGE_CHIP_CLASS} shrink-0 ${statusBadgeClass(p.status)}`}
                        >
                          {statusLabelDa(p.status)}
                        </span>
                        <div className="flex w-[80px] shrink-0 items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-300"
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-24 shrink-0 text-right font-body text-[11px] text-on-surface-variant">
                          {p.deadline ? formatDanishDate(p.deadline) : "—"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* Right 40% */}
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="mb-3 font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Næste deadlines
            </h2>
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm ring-1 ring-black/[0.03]">
              {deadlines.length === 0 ? (
                <p className="text-sm text-on-surface-variant/90">Ingen kommende deadlines.</p>
              ) : (
                <ul className="space-y-4">
                  {deadlines.map((d) => (
                    <li key={d.id} className="flex gap-3">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: d.dotColor }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm font-semibold text-on-surface">
                          {formatDanishDate(d.deadline)}
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
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Kommende møder
            </h2>
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
                        <span className="font-body text-sm font-medium text-on-surface">{m.title}</span>
                      </div>
                      <Link
                        href={`/projekter/${m.projectId}`}
                        className="inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-0.5 font-body text-[11px] font-semibold text-primary hover:bg-primary/15"
                      >
                        {m.projectName}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
