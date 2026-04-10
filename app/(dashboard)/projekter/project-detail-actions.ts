"use server";

import { revalidatePath } from "next/cache";
import type { Priority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { getSessionUser } from "@/lib/auth/session-user";
import { createNotification } from "@/lib/notifications/service";
import { projectAccessWhere } from "@/lib/projekter/project-access";

async function assertProjectMember(projectId: string, userId: string) {
  const p = await prisma.project.findFirst({
    where: { id: projectId, ...projectAccessWhere(userId) },
    select: { id: true },
  });
  if (!p) throw new Error("Projekt ikke fundet eller ingen adgang.");
}

export async function cycleTaskStatus(taskId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: projectAccessWhere(user.id),
    },
    select: { id: true, status: true },
  });
  if (!task) throw new Error("Opgave ikke fundet.");

  const order: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
  const next = order[(order.indexOf(task.status) + 1) % order.length];
  await prisma.task.update({ where: { id: taskId }, data: { status: next } });
  const project = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (project) revalidatePath(`/projekter/${project.projectId}`);
}

export async function updateTaskFields(input: {
  taskId: string;
  description?: string | null;
  deadline?: string | null;
  userId?: string | null;
  priority?: Priority;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const task = await prisma.task.findFirst({
    where: { id: input.taskId, project: projectAccessWhere(user.id) },
    select: {
      id: true,
      projectId: true,
      userId: true,
      title: true,
      project: { select: { name: true } },
    },
  });
  if (!task) throw new Error("Opgave ikke fundet.");

  if (input.userId) {
    const allowed = await prisma.user.findFirst({
      where: {
        id: input.userId,
        OR: [
          {
            ownedProjects: {
              some: { id: task.projectId },
            },
          },
          {
            projectMembers: {
              some: { projectId: task.projectId },
            },
          },
        ],
      },
    });
    if (!allowed) throw new Error("Ugyldig ansvarlig.");
  }

  if (
    input.userId !== undefined &&
    input.userId &&
    input.userId !== task.userId &&
    input.userId !== user.id
  ) {
    const assigner = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    });
    const label =
      assigner?.name?.trim() || assigner?.email || "En bruger";
    await createNotification({
      userId: input.userId,
      type: "TASK_ASSIGNED",
      message: `${label} har tildelt dig en opgave på ${task.project.name}`,
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    });
  }

  await prisma.task.update({
    where: { id: input.taskId },
    data: {
      ...(input.description !== undefined && { description: input.description }),
      ...(input.deadline !== undefined && {
        deadline: input.deadline ? new Date(input.deadline) : null,
      }),
      ...(input.userId !== undefined && {
        userId: input.userId || null,
      }),
      ...(input.priority !== undefined && { priority: input.priority }),
    },
  });
  revalidatePath(`/projekter/${task.projectId}`);
}

export async function createTask(projectId: string, title: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const t = title.trim();
  if (!t) throw new Error("Titel påkrævet.");

  await assertProjectMember(projectId, user.id);
  await prisma.task.create({
    data: {
      projectId,
      title: t,
    },
  });
  revalidatePath(`/projekter/${projectId}`);
}

export async function addProjectComment(projectId: string, content: string) {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");
  const text = content.trim();
  if (!text) throw new Error("Kommentar tom.");

  await assertProjectMember(projectId, user.id);
  await ensureAppUser(user);

  await prisma.comment.create({
    data: {
      content: text,
      authorId: user.id,
      projectId,
    },
  });
  revalidatePath(`/projekter/${projectId}`);
}

export async function addTaskComment(taskId: string, content: string) {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");
  const text = content.trim();
  if (!text) throw new Error("Kommentar tom.");

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: projectAccessWhere(user.id) },
    select: { projectId: true },
  });
  if (!task) throw new Error("Opgave ikke fundet.");

  await ensureAppUser(user);
  await prisma.comment.create({
    data: {
      content: text,
      authorId: user.id,
      taskId,
    },
  });
  revalidatePath(`/projekter/${task.projectId}`);
}

export async function confirmActivity(activityId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const row = await prisma.activity.findFirst({
    where: { id: activityId, project: projectAccessWhere(user.id) },
    select: { projectId: true },
  });
  if (!row) throw new Error("Aktivitet ikke fundet.");

  await prisma.activity.update({
    where: { id: activityId },
    data: { confirmed: true },
  });
  revalidatePath(`/projekter/${row.projectId}`);
}

export async function deleteActivity(activityId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const row = await prisma.activity.findFirst({
    where: { id: activityId, project: projectAccessWhere(user.id) },
    select: { projectId: true },
  });
  if (!row) throw new Error("Aktivitet ikke fundet.");

  await prisma.activity.delete({ where: { id: activityId } });
  revalidatePath(`/projekter/${row.projectId}`);
}

export async function createCalendarEvent(input: {
  projectId: string;
  title: string;
  date: string;
  time?: string | null;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  await assertProjectMember(input.projectId, user.id);

  const title = input.title.trim();
  if (!title) throw new Error("Titel påkrævet.");
  const d = new Date(input.date);
  if (Number.isNaN(d.getTime())) throw new Error("Ugyldig dato.");

  await prisma.calendarEvent.create({
    data: {
      projectId: input.projectId,
      title,
      date: d,
      eventTime: input.time?.trim() || null,
    },
  });
  revalidatePath(`/projekter/${input.projectId}`);
}

export async function createProjectFileRecord(input: {
  projectId: string;
  name: string;
  fileType: string;
  url: string;
  storagePath?: string | null;
}) {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  await assertProjectMember(input.projectId, user.id);
  await ensureAppUser(user);

  await prisma.file.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      fileType: input.fileType,
      url: input.url,
      storagePath: input.storagePath ?? null,
      uploadedById: user.id,
    },
  });
  revalidatePath(`/projekter/${input.projectId}`);
}

export async function deleteProjectFile(fileId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const file = await prisma.file.findFirst({
    where: { id: fileId, project: projectAccessWhere(user.id) },
    select: { id: true, projectId: true, storagePath: true },
  });
  if (!file) throw new Error("Fil ikke fundet.");

  await prisma.file.delete({ where: { id: fileId } });
  revalidatePath(`/projekter/${file.projectId}`);
  return { storagePath: file.storagePath };
}
