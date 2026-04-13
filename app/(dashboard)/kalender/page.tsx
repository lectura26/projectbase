import { redirect } from "next/navigation";
import KalenderPageClient from "@/components/kalender/KalenderPageClient";
import { getSessionUser } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import type {
  KalenderEvent,
  KalenderProject,
  KalenderTaskDeadline,
  KalenderUserOption,
} from "@/types/kalender";

export default async function KalenderPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const projects = await prisma.project.findMany({
    where: projectAccessWhere(user.id),
    select: {
      id: true,
      name: true,
      userId: true,
      members: { select: { userId: true } },
    },
    orderBy: { name: "asc" },
  });

  const ids = projects.map((p) => p.id);

  const [events, tasks] =
    ids.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.calendarEvent.findMany({
            where: { projectId: { in: ids } },
            include: { project: { select: { name: true } } },
            orderBy: { date: "asc" },
          }),
          prisma.task.findMany({
            where: {
              projectId: { in: ids },
              deadline: { not: null },
              status: { not: "DONE" },
            },
            include: { project: { select: { name: true } } },
            orderBy: { deadline: "asc" },
          }),
        ]);

  const projectPayload: KalenderProject[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    ownerId: p.userId,
    memberIds: p.members.map((m) => m.userId),
  }));

  const eventPayload: KalenderEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString(),
    eventTime: e.eventTime,
    projectId: e.projectId,
    projectName: e.project.name,
  }));

  const taskPayload: KalenderTaskDeadline[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    deadline: t.deadline!.toISOString(),
    projectId: t.projectId,
    projectName: t.project.name,
    assigneeId: t.userId,
  }));

  const userIds = new Set<string>();
  for (const p of projects) {
    userIds.add(p.userId);
    for (const m of p.members) userIds.add(m.userId);
  }
  for (const t of tasks) {
    if (t.userId) userIds.add(t.userId);
  }

  const users =
    userIds.size === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        });

  const userOptions: KalenderUserOption[] = users.map((u) => ({
    id: u.id,
    name: u.name ?? u.email,
    email: u.email,
  }));

  return (
    <KalenderPageClient
      projects={projectPayload}
      events={eventPayload}
      tasks={taskPayload}
      users={userOptions}
    />
  );
}
