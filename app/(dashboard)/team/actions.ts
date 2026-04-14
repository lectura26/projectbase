"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session-user";
import { getSharedProjectIdsForUserPair } from "@/lib/team/shared-project-users";
import { parseOrThrow } from "@/lib/validation/parse";
import { uuidSchema } from "@/lib/validation/schemas";

export async function getTeamMemberDetail(memberId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const mid = parseOrThrow(uuidSchema, memberId);

  const sharedIds = await getSharedProjectIdsForUserPair(user.id, mid);
  if (sharedIds.length === 0) {
    throw new Error("Ingen adgang til denne bruger.");
  }

  const member = await prisma.user.findUnique({
    where: { id: mid },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      appRole: true,
    },
  });
  if (!member) throw new Error("Bruger ikke fundet.");

  const openTasks = await prisma.task.findMany({
    where: {
      userId: mid,
      status: { not: "DONE" },
      projectId: { in: sharedIds },
      project: { isTemplate: false },
    },
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ deadline: "asc" }, { title: "asc" }],
  });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const events = await prisma.calendarEvent.findMany({
    where: {
      date: { gte: start, lte: end },
      projectId: { in: sharedIds },
    },
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  const tasksByProject = new Map<
    string,
    { id: string; name: string; tasks: typeof openTasks }
  >();
  for (const t of openTasks) {
    const pid = t.project.id;
    if (!tasksByProject.has(pid)) {
      tasksByProject.set(pid, {
        id: pid,
        name: t.project.name,
        tasks: [],
      });
    }
    tasksByProject.get(pid)!.tasks.push(t);
  }

  return {
    member,
    taskGroups: Array.from(tasksByProject.values()),
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date.toISOString(),
      startTime: e.startTime,
      endTime: e.endTime,
      projectId: e.projectId,
      projectName: e.project?.name ?? "",
    })),
  };
}
