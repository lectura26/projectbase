import { redirect } from "next/navigation";
import KalenderPageClient from "@/components/kalender/KalenderPageClient";
import { getSessionUser } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import type { CalendarMeetingDTO, CalendarProjectOption } from "@/types/calendar";

export default async function KalenderPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [meetings, projects] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { userId: user.id },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }, { title: "asc" }],
    }),
    prisma.project.findMany({
      where: {
        ...projectAccessWhere(user.id),
        status: { not: "COMPLETED" },
      },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const meetingPayload: CalendarMeetingDTO[] = meetings.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString(),
    startTime: e.startTime,
    endTime: e.endTime,
    projectId: e.projectId,
    project: e.project,
  }));

  const projectPayload: CalendarProjectOption[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));

  return (
    <KalenderPageClient meetings={meetingPayload} projects={projectPayload} />
  );
}
