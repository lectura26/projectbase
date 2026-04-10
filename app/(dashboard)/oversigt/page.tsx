import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OversigtPageClient from "@/components/oversigt/OversigtPageClient";
import { contactInitials, taskProgress } from "@/components/projekter/project-helpers";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { getSessionUser } from "@/lib/auth/session-user";
import { copenhagenDayRangeUTC } from "@/lib/datetime/copenhagen-range";
import { projectCalendarColor } from "@/lib/projekter/display";
import { prisma } from "@/lib/prisma";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import type {
  OversigtDeadlineItem,
  OversigtMeetingItem,
  OversigtPulseProject,
  OversigtTaskRow,
} from "@/types/oversigt";
import { toZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Oversigt",
};

const TZ = "Europe/Copenhagen";

function daGreeting(reference: Date): string {
  const z = toZonedTime(reference, TZ);
  const h = z.getHours();
  if (h >= 5 && h < 10) return "Godmorgen";
  if (h >= 10 && h < 12) return "God formiddag";
  if (h >= 12 && h < 18) return "God eftermiddag";
  if (h >= 18 && h < 22) return "God aften";
  return "God nat";
}

function formatDateLine(reference: Date): string {
  return reference.toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
}

function meetingTimeLabel(date: Date, eventTime: string | null): string {
  if (eventTime?.trim()) return eventTime.trim();
  return date.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

export default async function OversigtPage() {
  const user = await getSessionUser();
  if (!user?.email) redirect("/login");

  await ensureAppUser(user);

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true },
  });
  if (!row) redirect("/login");

  const displayName = (row.name?.trim() || row.email).trim();
  const now = new Date();
  const { start: dayStart, end: dayEnd } = copenhagenDayRangeUTC(now);

  const [todayTasks, pulseRaw, deadlineTasks, meetingRows] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId: user.id,
        status: { not: "DONE" },
        deadline: { gte: dayStart, lte: dayEnd },
        project: projectAccessWhere(user.id),
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: [{ deadline: "asc" }, { title: "asc" }],
    }),
    prisma.project.findMany({
      where: projectAccessWhere(user.id),
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        tasks: { select: { status: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        userId: user.id,
        status: { not: "DONE" },
        deadline: { gte: now },
        project: projectAccessWhere(user.id),
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: [{ deadline: "asc" }, { title: "asc" }],
      take: 5,
    }),
    prisma.calendarEvent.findMany({
      where: {
        date: { gte: dayStart },
        project: projectAccessWhere(user.id),
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: [{ date: "asc" }, { title: "asc" }],
      take: 5,
    }),
  ]);

  const tasks: OversigtTaskRow[] = todayTasks.map((t) => ({
    id: t.id,
    title: t.title,
    projectId: t.projectId,
    projectName: t.project.name,
    priority: t.priority,
    status: t.status,
    deadline: t.deadline ? t.deadline.toISOString() : null,
  }));

  const pulseProjects: OversigtPulseProject[] = pulseRaw.map((p) => {
    const pct = taskProgress(p.tasks) ?? 0;
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      deadline: p.deadline ? p.deadline.toISOString() : null,
      progress: pct,
      initials: contactInitials(p.name),
    };
  });

  const deadlines: OversigtDeadlineItem[] = deadlineTasks.map((t) => ({
    id: t.id,
    deadline: t.deadline!.toISOString(),
    title: t.title,
    projectId: t.projectId,
    projectName: t.project.name,
    dotColor: projectCalendarColor(t.projectId),
  }));

  const meetings: OversigtMeetingItem[] = meetingRows.map((e) => ({
    id: e.id,
    dateIso: e.date.toISOString(),
    timeLabel: meetingTimeLabel(e.date, e.eventTime),
    title: e.title,
    projectId: e.projectId,
    projectName: e.project.name,
  }));

  return (
    <OversigtPageClient
      greeting={`${daGreeting(now)}, ${displayName}`}
      dateLine={formatDateLine(now)}
      tasks={tasks}
      pulseProjects={pulseProjects}
      deadlines={deadlines}
      meetings={meetings}
    />
  );
}
