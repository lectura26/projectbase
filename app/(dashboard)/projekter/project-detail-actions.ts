"use server";

import { revalidatePath } from "next/cache";
import type { Priority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { getSessionUser } from "@/lib/auth/session-user";
import { createNotification } from "@/lib/notifications/service";
import { PRIVATE_FILE_PLACEHOLDER } from "@/lib/files/private-file-url";
import { ymdStringToDateOrNull } from "@/lib/datetime/ymd";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import { removeStorageObject } from "@/lib/supabase/storage-remove";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  commentContentSchema,
  createTaskActionSchema,
  createTaskNoteSchema,
  cuidLikeSchema,
  projectFileRecordSchema,
  setTaskStatusSchema,
  updateTaskFieldsSchema,
  updateTaskTitleSchema,
} from "@/lib/validation/schemas";
import type { TaskDetailDTO, TaskNoteDTO } from "@/types/project-detail";

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

  parseOrThrow(cuidLikeSchema, taskId);

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
  return { newStatus: next };
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  parseOrThrow(setTaskStatusSchema, { taskId, status });

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: projectAccessWhere(user.id),
    },
    select: { id: true, projectId: true },
  });
  if (!task) throw new Error("Opgave ikke fundet.");

  await prisma.task.update({ where: { id: taskId }, data: { status } });
}

export async function updateTaskFields(input: {
  taskId: string;
  description?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  userId?: string | null;
  priority?: Priority;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const parsed = parseOrThrow(updateTaskFieldsSchema, input);

  const task = await prisma.task.findFirst({
    where: { id: parsed.taskId, project: projectAccessWhere(user.id) },
    select: {
      id: true,
      projectId: true,
      userId: true,
      title: true,
      project: { select: { name: true } },
    },
  });
  if (!task) throw new Error("Opgave ikke fundet.");

  if (parsed.userId) {
    const allowed = await prisma.user.findFirst({
      where: {
        id: parsed.userId,
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
    parsed.userId !== undefined &&
    parsed.userId &&
    parsed.userId !== task.userId &&
    parsed.userId !== user.id
  ) {
    const assigner = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    });
    const label =
      assigner?.name?.trim() || assigner?.email || "En bruger";
    await createNotification({
      userId: parsed.userId!,
      type: "TASK_ASSIGNED",
      message: `${label} har tildelt dig en opgave på ${task.project.name}`,
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    });
  }

  await prisma.task.update({
    where: { id: parsed.taskId },
    data: {
      ...(parsed.description !== undefined && { description: parsed.description }),
      ...(parsed.startDate !== undefined && {
        startDate: ymdStringToDateOrNull(parsed.startDate),
      }),
      ...(parsed.deadline !== undefined && {
        deadline: ymdStringToDateOrNull(parsed.deadline),
      }),
      ...(parsed.userId !== undefined && {
        userId: parsed.userId || null,
      }),
      ...(parsed.priority !== undefined && { priority: parsed.priority }),
    },
  });
  revalidatePath(`/projekter/${task.projectId}`);
}

export async function updateTaskTitle(taskId: string, title: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const parsed = parseOrThrow(updateTaskTitleSchema, { taskId, title });

  const task = await prisma.task.findFirst({
    where: { id: parsed.taskId, project: projectAccessWhere(user.id) },
    select: { id: true, projectId: true },
  });
  if (!task) throw new Error("Opgave ikke fundet.");

  await prisma.task.update({
    where: { id: parsed.taskId },
    data: { title: parsed.title },
  });
  revalidatePath(`/projekter/${task.projectId}`);
}

export async function updateTaskDescription(taskId: string, description: string | null) {
  return updateTaskFields({ taskId, description });
}

export const updateTaskField = updateTaskFields;

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  userId?: string | null;
  priority?: Priority;
};

export async function createTask(projectId: string, input: CreateTaskInput): Promise<TaskDetailDTO> {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  parseOrThrow(cuidLikeSchema, projectId);
  const parsed = parseOrThrow(createTaskActionSchema, input);

  await assertProjectMember(projectId, user.id);

  if (parsed.userId) {
    const allowed = await prisma.user.findFirst({
      where: {
        id: parsed.userId,
        OR: [
          { ownedProjects: { some: { id: projectId } } },
          { projectMembers: { some: { projectId } } },
        ],
      },
    });
    if (!allowed) throw new Error("Ugyldig ansvarlig.");
  }

  const row = await prisma.task.create({
    data: {
      projectId,
      title: parsed.title,
      description: parsed.description?.trim() || null,
      startDate: ymdStringToDateOrNull(parsed.startDate ?? ""),
      deadline: ymdStringToDateOrNull(parsed.deadline ?? ""),
      userId: parsed.userId || null,
      priority: parsed.priority ?? "MEDIUM",
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (parsed.userId && parsed.userId !== user.id) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });
    const assigner = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    });
    const label = assigner?.name?.trim() || assigner?.email || "En bruger";
    await createNotification({
      userId: parsed.userId!,
      type: "TASK_ASSIGNED",
      message: `${label} har tildelt dig en opgave på ${project?.name ?? "projekt"}`,
      relatedProjectId: projectId,
      relatedTaskId: row.id,
    });
  }

  revalidatePath(`/projekter/${projectId}`);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    startDate: row.startDate ? row.startDate.toISOString() : null,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    assignee: row.user
      ? {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
          image: row.user.image,
        }
      : null,
    comments: [],
    notes: [],
  };
}

export async function createTaskNote(taskId: string, content: string): Promise<TaskNoteDTO> {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  const parsed = parseOrThrow(createTaskNoteSchema, { taskId, content });

  const task = await prisma.task.findFirst({
    where: { id: parsed.taskId, project: projectAccessWhere(user.id) },
    select: { id: true, projectId: true },
  });
  if (!task) throw new Error("Opgave ikke fundet.");

  await ensureAppUser(user);

  const row = await prisma.taskNote.create({
    data: {
      taskId: parsed.taskId,
      authorId: user.id,
      content: parsed.content,
    },
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  revalidatePath(`/projekter/${task.projectId}`);

  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    author: row.author,
  };
}

export async function addProjectComment(projectId: string, content: string) {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  parseOrThrow(cuidLikeSchema, projectId);
  const text = parseOrThrow(commentContentSchema, content);

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

  parseOrThrow(cuidLikeSchema, taskId);
  const text = parseOrThrow(commentContentSchema, content);

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

  parseOrThrow(cuidLikeSchema, activityId);

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

  parseOrThrow(cuidLikeSchema, activityId);

  const row = await prisma.activity.findFirst({
    where: { id: activityId, project: projectAccessWhere(user.id) },
    select: { projectId: true },
  });
  if (!row) throw new Error("Aktivitet ikke fundet.");

  await prisma.activity.delete({ where: { id: activityId } });
  revalidatePath(`/projekter/${row.projectId}`);
}

export async function createProjectFileRecord(input: {
  projectId: string;
  name: string;
  fileType: string;
  storagePath: string;
}) {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  const parsed = parseOrThrow(projectFileRecordSchema, input);

  await assertProjectMember(parsed.projectId, user.id);
  await ensureAppUser(user);

  await prisma.file.create({
    data: {
      projectId: parsed.projectId,
      name: parsed.name,
      fileType: parsed.fileType,
      url: PRIVATE_FILE_PLACEHOLDER,
      storagePath: parsed.storagePath,
      uploadedById: user.id,
    },
  });
  revalidatePath(`/projekter/${parsed.projectId}`);
}

export async function deleteProjectFile(fileId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  parseOrThrow(cuidLikeSchema, fileId);

  const file = await prisma.file.findFirst({
    where: { id: fileId, project: projectAccessWhere(user.id) },
    select: { id: true, projectId: true, storagePath: true },
  });
  if (!file) throw new Error("Fil ikke fundet.");

  await prisma.file.delete({ where: { id: fileId } });
  if (file.storagePath) {
    const removed = await removeStorageObject(file.storagePath);
    if (!removed.ok) {
      console.error("[deleteProjectFile] storage remove failed", file.storagePath);
    }
  }
  revalidatePath(`/projekter/${file.projectId}`);
}
