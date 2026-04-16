import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OversigtPageClient from "@/components/oversigt/OversigtPageClient";
import { contactInitials, taskProgress } from "@/components/projekter/project-helpers";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { getSessionUser } from "@/lib/auth/session-user";
import { projectCalendarColor } from "@/lib/projekter/display";
import {
  formatFocusPickerDate,
  getFocusProjectCardData,
  selectAutoFocusProject,
} from "@/lib/focus/get-focus-project";
import { getCachedOversigtDashboardData } from "@/lib/data/cached-queries";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import { prisma } from "@/lib/prisma";
import type {
  OversigtActivityItem,
  OversigtDeadlineItem,
  OversigtMeetingItem,
  OversigtPulseProject,
  OversigtTaskRow,
} from "@/types/oversigt";
import { toZonedTime } from "date-fns-tz";

export const revalidate = 30;

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

function calendarMeetingTimeLabel(
  startTime: string | null,
  endTime: string | null,
): string {
  const s = startTime?.trim();
  if (!s) return "Hele dagen";
  const e = endTime?.trim();
  if (e) return `${s}–${e}`;
  return s;
}

export default async function OversigtPage() {
  const user = await getSessionUser();
  if (!user?.email) redirect("/login");

  await ensureAppUser(user);

  const data = await getCachedOversigtDashboardData(user.id);
  if (!data) redirect("/login");

  const { user: row, now, upcomingTasks, pulseRaw, deadlineTasks, meetingRows } =
    data;

  const displayName = (row.name?.trim() || row.email).trim();

  const tasks: OversigtTaskRow[] = upcomingTasks.map((t) => ({
    id: t.id,
    title: t.title,
    projectId: t.projectId,
    projectName: t.project.name,
    projectColor: t.project.color,
    priority: t.priority,
    status: t.status,
    deadline: t.deadline ? t.deadline.toISOString() : null,
  }));

  const pulseProjects: OversigtPulseProject[] = pulseRaw.map((p) => {
    const pct = taskProgress(p.tasks) ?? 0;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
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

  const sortedMeetings = [...meetingRows]
    .sort((a, b) => {
      const d = a.date.getTime() - b.date.getTime();
      if (d !== 0) return d;
      const at = a.startTime ?? "";
      const bt = b.startTime ?? "";
      return at.localeCompare(bt);
    })
    .slice(0, 5);

  const meetings: OversigtMeetingItem[] = sortedMeetings.map((e) => ({
    id: e.id,
    dateIso: e.date.toISOString(),
    timeLabel: calendarMeetingTimeLabel(e.startTime, e.endTime),
    title: e.title,
    projectId: e.projectId,
    projectName: e.project?.name ?? null,
    source: "calendar",
    projectColor: e.project?.color ?? null,
  }));

  const [focusProject, focusPick, allNotesRaw] = await Promise.all([
    getFocusProjectCardData(user.id),
    selectAutoFocusProject(user.id),
    prisma.taskNote.findMany({
      where: {
        OR: [
          { task: { project: projectAccessWhere(user.id) } },
          { meeting: { userId: user.id } },
        ],
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            projectId: true,
            project: { select: { id: true, name: true, color: true } },
          },
        },
        meeting: {
          select: {
            id: true,
            title: true,
            projectId: true,
            project: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const seenTasks = new Set<string>();
  const seenMeetings = new Set<string>();
  const latestActivity = allNotesRaw.filter((note) => {
    if (note.taskId) {
      if (seenTasks.has(note.taskId)) return false;
      seenTasks.add(note.taskId);
      return true;
    }
    if (note.meetingId) {
      if (seenMeetings.has(note.meetingId)) return false;
      seenMeetings.add(note.meetingId);
      return true;
    }
    return false;
  }).slice(0, 4);

  const recentActivity: OversigtActivityItem[] = latestActivity.map((n) => ({
    id: n.id,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
    taskId: n.taskId,
    projectId: n.task?.projectId ?? n.meeting?.projectId ?? null,
    taskTitle: n.task?.title ?? null,
    meetingId: n.meetingId,
    meetingTitle: n.meeting?.title ?? null,
    projectName: n.task?.project?.name ?? n.meeting?.project?.name ?? null,
    projectColor: n.task?.project?.color ?? n.meeting?.project?.color ?? null,
  }));

  const focusPickerFirstName =
    displayName.split(/\s+/).filter(Boolean)[0] ?? displayName;

  return (
    <OversigtPageClient
      greeting={`${daGreeting(now)}, ${displayName}`}
      dateLine={formatDateLine(now)}
      tasks={tasks}
      pulseProjects={pulseProjects}
      deadlines={deadlines}
      meetings={meetings}
      focusProject={focusProject}
      focusSuggestions={focusPick.suggestions}
      focusAutoSelectedId={focusPick.autoSelectedId}
      isFocusSetToday={focusProject !== null}
      focusPickerTodayLabel={formatFocusPickerDate(now)}
      focusPickerDisplayName={focusPickerFirstName}
      recentActivity={recentActivity}
    />
  );
}
