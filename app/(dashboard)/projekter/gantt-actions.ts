"use server";

import { prisma } from "@/lib/prisma";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { getSessionUser } from "@/lib/auth/session-user";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import { parseOrThrow } from "@/lib/validation/parse";
import { ganttTasksForProjectSchema } from "@/lib/validation/schemas";
import type { GanttTaskRow } from "@/types/projekter";

export async function getGanttTasksForProject(
  projectId: string,
): Promise<GanttTaskRow[]> {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  const parsed = parseOrThrow(ganttTasksForProjectSchema, { projectId });

  await ensureAppUser(user);

  const project = await prisma.project.findFirst({
    where: { id: parsed.projectId, ...projectAccessWhere(user.id) },
    select: { id: true },
  });
  if (!project) throw new Error("Projekt ikke fundet eller ingen adgang.");

  const tasks = await prisma.task.findMany({
    where: { projectId: parsed.projectId },
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      deadline: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    startDate: t.startDate?.toISOString() ?? null,
    deadline: t.deadline?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));
}
