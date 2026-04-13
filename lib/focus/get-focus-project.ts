import type { Priority, ProjectStatus, TaskStatus } from "@prisma/client";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { da } from "date-fns/locale";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { taskProgress } from "@/components/projekter/project-helpers";
import { prisma } from "@/lib/prisma";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import type {
  OversigtFocusProjectCard,
  OversigtFocusSuggestion,
} from "@/types/oversigt";

const TZ = "Europe/Copenhagen";

function startOfTodayCopenhagen(): Date {
  const z = toZonedTime(new Date(), TZ);
  return fromZonedTime(startOfDay(z), TZ);
}

function sameCalendarDayInCopenhagen(a: Date, b: Date): boolean {
  const fa = format(toZonedTime(a, TZ), "yyyy-MM-dd");
  const fb = format(toZonedTime(b, TZ), "yyyy-MM-dd");
  return fa === fb;
}

type ProjectWithTasks = {
  id: string;
  name: string;
  color: string;
  status: ProjectStatus;
  deadline: Date | null;
  tasks: { deadline: Date | null; status: TaskStatus }[];
};

function projectDeadlineWithin3Days(p: ProjectWithTasks): boolean {
  if (!p.deadline) return false;
  const z = toZonedTime(new Date(), TZ);
  const dayStart = startOfDay(z);
  const windowEnd = endOfDay(addDays(dayStart, 3));
  const startUtc = fromZonedTime(dayStart, TZ);
  const endUtc = fromZonedTime(windowEnd, TZ);
  const t = p.deadline.getTime();
  return t >= startUtc.getTime() && t <= endUtc.getTime();
}

function overdueTaskCount(
  tasks: { deadline: Date | null; status: TaskStatus }[],
): number {
  const start = startOfTodayCopenhagen();
  return tasks.filter(
    (t) => t.status !== "DONE" && t.deadline && t.deadline.getTime() < start.getTime(),
  ).length;
}

function statusRank(status: ProjectStatus): number {
  if (status === "IN_PROGRESS") return 2;
  return 0;
}

function nearestDeadlineMs(p: ProjectWithTasks): number {
  const candidates: number[] = [];
  if (p.deadline) candidates.push(p.deadline.getTime());
  for (const t of p.tasks) {
    if (t.status !== "DONE" && t.deadline) candidates.push(t.deadline.getTime());
  }
  if (candidates.length === 0) return Number.MAX_SAFE_INTEGER;
  return Math.min(...candidates);
}

function compareFocusCandidates(a: ProjectWithTasks, b: ProjectWithTasks): number {
  const aD = projectDeadlineWithin3Days(a);
  const bD = projectDeadlineWithin3Days(b);
  if (aD !== bD) return aD ? -1 : 1;

  const ao = overdueTaskCount(a.tasks);
  const bo = overdueTaskCount(b.tasks);
  if (ao !== bo) return bo - ao;

  const ar = statusRank(a.status);
  const br = statusRank(b.status);
  if (ar !== br) return br - ar;

  return nearestDeadlineMs(a) - nearestDeadlineMs(b);
}

/** Returns `focusProjectId` if set for the current Copenhagen calendar day, else `null`. */
export async function getFocusProject(userId: string): Promise<string | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { focusProjectId: true, focusDate: true },
  });
  if (!row?.focusProjectId || !row.focusDate) return null;
  if (!sameCalendarDayInCopenhagen(row.focusDate, new Date())) return null;
  return row.focusProjectId;
}

export async function selectAutoFocusProject(userId: string): Promise<{
  suggestions: OversigtFocusSuggestion[];
  autoSelectedId: string | null;
}> {
  const projects = await prisma.project.findMany({
    where: {
      ...projectAccessWhere(userId),
      status: { not: "COMPLETED" },
    },
    include: { tasks: { select: { deadline: true, status: true } } },
  });

  const sorted = [...projects].sort(compareFocusCandidates);

  const suggestions: OversigtFocusSuggestion[] = sorted.slice(0, 3).map((p) => {
    const progress = taskProgress(p.tasks) ?? 0;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      status: p.status,
      deadline: p.deadline ? p.deadline.toISOString() : null,
      progress,
      overdueCount: overdueTaskCount(p.tasks),
      deadlineWithin3Days: projectDeadlineWithin3Days(p),
    };
  });

  return {
    suggestions,
    autoSelectedId: suggestions[0]?.id ?? null,
  };
}

const PRIORITY_ORDER: Record<Priority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function sortOpenTasksForFocus<T extends { status: TaskStatus; priority: Priority; deadline: Date | null }>(
  tasks: T[],
): T[] {
  const open = tasks.filter((t) => t.status !== "DONE");
  return [...open].sort((a, b) => {
    const pd = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    if (pd !== 0) return pd;
    const ad = a.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bd = b.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return ad - bd;
  });
}

export async function getFocusProjectCardData(
  userId: string,
): Promise<OversigtFocusProjectCard | null> {
  const focusId = await getFocusProject(userId);
  if (!focusId) return null;

  const project = await prisma.project.findFirst({
    where: { id: focusId, ...projectAccessWhere(userId) },
    include: {
      tasks: {
        select: { id: true, title: true, status: true, priority: true, deadline: true },
      },
    },
  });
  if (!project) {
    await prisma.user.update({
      where: { id: userId },
      data: { focusProjectId: null, focusDate: null },
    });
    return null;
  }

  const sorted = sortOpenTasksForFocus(project.tasks).slice(0, 3);
  const progress = taskProgress(project.tasks) ?? 0;

  return {
    id: project.id,
    name: project.name,
    color: project.color,
    status: project.status,
    deadline: project.deadline ? project.deadline.toISOString() : null,
    progress,
    tasks: sorted.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
    })),
  };
}

export function formatFocusPickerDate(reference: Date = new Date()): string {
  return format(reference, "EEEE 'den' d. MMMM yyyy", { locale: da });
}
