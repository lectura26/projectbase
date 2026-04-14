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
import type {
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

function meetingTimeLabel(date: Date, eventTime: string | null): string {
  if (eventTime?.trim()) return eventTime.trim();
  return date.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

function icsMeetingTimeLabel(start: Date, end: Date | null): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  };
  const a = start
    .toLocaleTimeString("da-DK", opts)
    .replace(/\u00a0/g, " ");
  if (!end) return a;
  const b = end
    .toLocaleTimeString("da-DK", opts)
    .replace(/\u00a0/g, " ");
  return `${a}–${b}`;
}

export default async function OversigtPage() {
  const user = await getSessionUser();
  if (!user?.email) redirect("/login");

  await ensureAppUser(user);

  const data = await getCachedOversigtDashboardData(user.id);
  if (!data) redirect("/login");

  const {
    user: row,
    now,
    upcomingTasks,
    pulseRaw,
    deadlineTasks,
    meetingRows,
    icsRowsForOversigt,
  } = data;

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

  const combinedMeetings = [
    ...meetingRows.map((e) => ({
      source: "calendar" as const,
      id: e.id,
      date: e.date,
      eventTime: e.eventTime,
      title: e.title,
      projectId: e.projectId,
      projectName: e.project.name,
      end: null as Date | null,
      projectColor: null as string | null,
    })),
    ...icsRowsForOversigt.map((e) => ({
      source: "ics" as const,
      id: e.id,
      date: e.start,
      eventTime: null as string | null,
      title: e.title,
      projectId: e.projectId,
      projectName: e.project?.name ?? null,
      end: e.end,
      projectColor: e.project?.color ?? null,
    })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const meetings: OversigtMeetingItem[] = combinedMeetings.map((m) => ({
    id: m.id,
    dateIso: m.date.toISOString(),
    timeLabel:
      m.source === "calendar"
        ? meetingTimeLabel(m.date, m.eventTime)
        : icsMeetingTimeLabel(m.date, m.end),
    title: m.title,
    projectId: m.projectId,
    projectName: m.projectName,
    source: m.source,
    projectColor: m.projectColor,
  }));

  const [focusProject, focusPick] = await Promise.all([
    getFocusProjectCardData(user.id),
    selectAutoFocusProject(user.id),
  ]);

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
    />
  );
}
