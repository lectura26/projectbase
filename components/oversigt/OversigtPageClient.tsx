"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { setTaskStatus } from "@/app/(dashboard)/projekter/project-detail-actions";
import {
  priorityBadgeClass,
  priorityLabelDa,
  statusBadgeClass,
  statusLabelDa,
} from "@/components/projekter/project-helpers";
import type {
  OversigtDeadlineItem,
  OversigtMeetingItem,
  OversigtPulseProject,
  OversigtTaskRow,
} from "@/types/oversigt";

function taskTimeLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  });
}

type Props = {
  greeting: string;
  dateLine: string;
  tasks: OversigtTaskRow[];
  pulseProjects: OversigtPulseProject[];
  deadlines: OversigtDeadlineItem[];
  meetings: OversigtMeetingItem[];
};

export default function OversigtPageClient({
  greeting,
  dateLine,
  tasks: initialTasks,
  pulseProjects,
  deadlines,
  meetings,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const onToggleTask = useCallback(
    (task: OversigtTaskRow, nextDone: boolean) => {
      if (!nextDone) return;
      setCompletingId(task.id);
      startTransition(async () => {
        try {
          await setTaskStatus(task.id, "DONE");
          router.refresh();
        } finally {
          setCompletingId(null);
        }
      });
    },
    [router],
  );

  return (
    <div className="min-w-0 pb-10">
      <header className="mb-8">
        <h1 className="font-headline text-[20px] font-semibold leading-tight text-primary">
          {greeting}
        </h1>
        <p className="mt-1 font-body text-[13px] text-on-surface-variant">{dateLine}</p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:gap-10">
        {/* Left 60% */}
        <div className="min-w-0 space-y-10">
          <section>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                Mine opgaver i dag
              </h2>
              <Link
                href="/projekter"
                className="shrink-0 font-body text-[11px] font-semibold uppercase tracking-wide text-primary hover:underline"
              >
                Vis alle
              </Link>
            </div>
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm ring-1 ring-black/[0.03]">
              {initialTasks.length === 0 ? (
                <p className="px-4 py-6 text-sm text-on-surface-variant/90">
                  Ingen opgaver med frist i dag.
                </p>
              ) : (
                <ul className="divide-y divide-outline-variant/15">
                  {initialTasks.map((task) => {
                    const done = completingId === task.id;
                    return (
                      <li
                        key={task.id}
                        className="flex min-h-[44px] items-center gap-3 px-4 py-2"
                      >
                        <button
                          type="button"
                          disabled={pending}
                          aria-pressed={done}
                          aria-label={done ? "Marker som ikke fuldført" : "Marker som fuldført"}
                          onClick={() => onToggleTask(task, !done)}
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors ${
                            done
                              ? "border-primary bg-primary text-on-primary"
                              : "border-primary/40 bg-transparent hover:border-primary"
                          }`}
                        >
                          {done ? (
                            <span className="material-symbols-outlined text-[14px] leading-none">
                              check
                            </span>
                          ) : null}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-body text-[14px] font-medium text-on-surface transition-[text-decoration-color,opacity,color] duration-300 ease-out ${
                              done
                                ? "text-on-surface-variant line-through decoration-on-surface-variant/50 [text-decoration-thickness:1px]"
                                : ""
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="font-body text-[12px] text-on-surface-variant">
                            {task.projectName}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityBadgeClass(task.priority)}`}
                        >
                          {priorityLabelDa(task.priority)}
                        </span>
                        <span className="w-12 shrink-0 text-right font-body text-[12px] tabular-nums text-on-surface-variant">
                          {taskTimeLabel(task.deadline)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
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
                        <span className="min-w-0 flex-1 font-body text-sm font-medium text-on-surface">
                          {p.name}
                        </span>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(p.status)}`}
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
                          {p.deadline
                            ? new Date(p.deadline).toLocaleDateString("da-DK", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                timeZone: "Europe/Copenhagen",
                              })
                            : "—"}
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
                          {new Date(d.deadline).toLocaleDateString("da-DK", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            timeZone: "Europe/Copenhagen",
                          })}
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
