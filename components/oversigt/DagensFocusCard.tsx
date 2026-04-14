"use client";

import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  priorityBadgeClass,
  priorityLabelDa,
  statusBadgeClass,
  statusLabelDa,
} from "@/components/projekter/project-helpers";
import { formatDanishDate } from "@/lib/datetime/format-danish";
import type { OversigtFocusProjectCard } from "@/types/oversigt";
import { differenceInCalendarDays, startOfDay } from "date-fns";
function taskStatusCircleClass(status: OversigtFocusProjectCard["tasks"][number]["status"]): string {
  if (status === "IN_PROGRESS") return "border-[#93c5fd] bg-[#dbeafe]";
  return "border-[#1a3167] bg-white";
}

function headerDeadlineLabel(deadlineIso: string | null): { text: string; urgent: boolean } {
  if (!deadlineIso) return { text: "—", urgent: false };
  const dl = startOfDay(new Date(deadlineIso));
  const now = startOfDay(new Date());
  const d = differenceInCalendarDays(dl, now);
  if (d < 0) return { text: `Overskredet ${Math.abs(d)}d`, urgent: true };
  if (d === 0) return { text: "Frist i dag", urgent: true };
  if (d <= 3) return { text: formatDanishDate(deadlineIso), urgent: true };
  return { text: formatDanishDate(deadlineIso), urgent: false };
}

type Props = {
  focusProject: OversigtFocusProjectCard | null;
  hasActiveProjects: boolean;
  onShiftFocus: () => void;
};

export function DagensFocusCard({ focusProject, hasActiveProjects, onShiftFocus }: Props) {
  const router = useRouter();

  if (!hasActiveProjects) {
    return (
      <section className="mb-6">
        <h2 className="mb-2 font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
          Dagens fokus
        </h2>
        <div className="w-full rounded-[8px] border border-dashed border-[#d1d5db] bg-white py-10 text-center">
          <FolderOpen className="mx-auto h-6 w-6 text-[#9ca3af]" aria-hidden />
          <p className="mt-2 text-[14px] text-[#6b7280]">Ingen aktive projekter</p>
          <p className="mt-1 text-[13px] text-[#9ca3af]">
            Opret et projekt for at anvende dagens fokus.
          </p>
          <Link
            href="/projekter"
            className="mt-3 inline-block text-[13px] font-medium text-[#1a3167] hover:underline"
          >
            + Opret projekt
          </Link>
        </div>
      </section>
    );
  }

  if (!focusProject) {
    return (
      <section className="mb-6">
        <h2 className="mb-2 font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
          Dagens fokus
        </h2>
        <button
          type="button"
          onClick={onShiftFocus}
          className="w-full rounded-[8px] border border-dashed border-[#d1d5db] border-l-4 bg-white py-10 text-center text-[14px] text-[#9ca3af] transition-colors hover:border-[#1a3167] hover:text-[#1a3167]"
        >
          Vælg dagens fokusprojekt →
        </button>
      </section>
    );
  }

  const headerDl = headerDeadlineLabel(focusProject.deadline);

  return (
    <section className="mb-6">
      <h2 className="mb-2 font-body text-[11px] font-medium uppercase tracking-[0.06em] text-[#9ca3af]">
        Dagens fokus
      </h2>
      <div
        className="rounded-[8px] border border-[#e8e8e8] bg-white px-5 py-[18px]"
        style={{ borderLeftWidth: 4, borderLeftColor: focusProject.color }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="font-body text-[16px] font-semibold text-[#0f1923]">{focusProject.name}</h3>
            <span
              className={`shrink-0 rounded-[4px] px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(focusProject.status)}`}
            >
              {statusLabelDa(focusProject.status)}
            </span>
          </div>
          <span
            className="shrink-0 font-body text-[12px]"
            style={{ color: headerDl.urgent ? "#dc2626" : "#6b7280" }}
          >
            {headerDl.text}
          </span>
        </div>

        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-[3px] bg-[#e8e8e8]">
          <div
            className="h-full rounded-[3px]"
            style={{ width: `${focusProject.progress}%`, backgroundColor: focusProject.color }}
          />
        </div>
        <p className="mt-1 text-right font-body text-[12px] text-[#6b7280]">{focusProject.progress}%</p>

        <div className="my-3 h-px bg-[#f3f4f6]" />

        {focusProject.tasks.length === 0 ? (
          <p className="py-3 text-center font-body text-[13px] italic text-[#9ca3af]">
            Ingen åbne opgaver
          </p>
        ) : (
          <ul>
            {focusProject.tasks.map((task) => (
              <li key={task.id} className="border-b border-[#f3f4f6] last:border-b-0">
                <button
                  type="button"
                  onClick={() => router.push(`/projekter/${focusProject.id}?taskId=${task.id}`)}
                  className="flex h-11 w-full cursor-pointer items-center gap-3 px-1 text-left transition-colors hover:bg-[#f8f9fa]"
                >
                  <span
                    className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${taskStatusCircleClass(task.status)}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-body text-[13px] text-[#0f1923]">
                    {task.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-[4px] px-2 py-0.5 text-[11px] font-semibold ${priorityBadgeClass(task.priority)}`}
                  >
                    {priorityLabelDa(task.priority)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onShiftFocus}
            className="font-body text-[12px] text-[#6b7280] hover:text-[#1a3167]"
          >
            Skift fokus
          </button>
        </div>
      </div>
    </section>
  );
}
