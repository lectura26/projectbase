"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Priority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { getSessionUser } from "@/lib/auth/session-user";
import { createNotification } from "@/lib/notifications/service";
import { PRIVATE_FILE_PLACEHOLDER } from "@/lib/files/private-file-url";
import { ymdStringToDateOrNull } from "@/lib/datetime/ymd";
import {
  ALLOWED_TYPES,
  mimeFromExt,
  sanitizeOriginalFilename,
  validateUploadFile,
  validateVisualUpload,
} from "@/lib/storage/file-validation";
import { ensureProjectFilesBucket, getSupabaseAdmin } from "@/lib/supabase/admin";
import { SUPABASE_STORAGE_BUCKET } from "@/lib/supabase/storage-bucket";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import { removeStorageObject } from "@/lib/supabase/storage-remove";
import { createSignedStorageUrl } from "@/lib/supabase/storage-signed";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  commentContentSchema,
  createTaskActionSchema,
  createTaskNoteSchema,
  createTodoItemSchema,
  reorderTodoItemsSchema,
  reorderVisualsSchema,
  updateTodoItemSchema,
  cuidLikeSchema,
  setTaskStatusSchema,
  updateTaskFieldsSchema,
  updateTaskTitleSchema,
} from "@/lib/validation/schemas";
import type { TaskDetailDTO, TaskNoteDTO, TodoItemDTO } from "@/types/project-detail";

async function assertProjectMember(projectId: string, userId: string) {
  const p = await prisma.project.findFirst({
    where: { id: projectId, ...projectAccessWhere(userId) },
    select: { id: true },
  });
  if (!p) throw new Error("Projekt ikke fundet eller ingen adgang.");
}

function mapTodoItem(row: {
  id: string;
  content: string;
  done: boolean;
  createdAt: Date;
  sortOrder: number;
}): TodoItemDTO {
  return {
    id: row.id,
    content: row.content,
    done: row.done,
    createdAt: row.createdAt.toISOString(),
    sortOrder: row.sortOrder,
  };
}

async function assertTodoAccess(todoId: string, userId: string) {
  const todo = await prisma.todoItem.findUnique({
    where: { id: todoId },
    select: { taskId: true, meetingId: true },
  });
  if (!todo) throw new Error("To-do ikke fundet.");
  if (todo.taskId) {
    const t = await prisma.task.findFirst({
      where: { id: todo.taskId, project: projectAccessWhere(userId) },
      select: { projectId: true },
    });
    if (!t) throw new Error("Ingen adgang.");
    return { kind: "task" as const, projectId: t.projectId };
  }
  if (todo.meetingId) {
    const m = await prisma.calendarEvent.findFirst({
      where: { id: todo.meetingId, userId },
      select: { projectId: true },
    });
    if (!m) throw new Error("Ingen adgang.");
    return { kind: "meeting" as const, projectId: m.projectId };
  }
  throw new Error("Ugyldig to-do.");
}

function revalidateAfterTodoChange(ctx: {
  kind: "task" | "meeting";
  projectId: string | null;
}) {
  if (ctx.kind === "task") {
    revalidatePath(`/projekter/${ctx.projectId}`);
    return;
  }
  revalidatePath("/kalender");
  revalidatePath("/oversigt");
  if (ctx.projectId) revalidatePath(`/projekter/${ctx.projectId}`);
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

export async function deleteTask(taskId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  parseOrThrow(cuidLikeSchema, taskId);

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: projectAccessWhere(user.id),
    },
    select: { id: true, projectId: true },
  });
  if (!task) throw new Error("Opgave ikke fundet.");

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/projekter/${task.projectId}`);
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

/**
 * Moves legacy `task.description` into a TaskNote (single source of truth for rich text).
 * No-op if the task already has any TaskNotes. Clears `task.description` after success.
 */
export async function migrateTaskDescription(
  taskId: string,
  description: string,
): Promise<{ migrated: boolean; note?: TaskNoteDTO }> {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  parseOrThrow(cuidLikeSchema, taskId);
  const content = parseOrThrow(commentContentSchema, description);

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: projectAccessWhere(user.id) },
    select: { id: true, projectId: true },
  });
  if (!task) throw new Error("Opgave ikke fundet.");

  await ensureAppUser(user);

  const row = await prisma.$transaction(async (tx) => {
    const existing = await tx.taskNote.count({ where: { taskId } });
    if (existing > 0) return null;
    return tx.taskNote.create({
      data: {
        taskId,
        authorId: user.id,
        content,
      },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
      },
    });
  });

  if (!row) return { migrated: false };

  await prisma.task.update({
    where: { id: taskId },
    data: { description: null },
  });

  revalidatePath(`/projekter/${task.projectId}`);

  const note: TaskNoteDTO = {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.author.id,
      name: row.author.name,
      email: row.author.email,
      image: row.author.image,
    },
  };

  return { migrated: true, note };
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

  let notesOut: TaskNoteDTO[] = [];
  const descTrim = parsed.description?.trim() ?? "";
  if (descTrim) {
    const mig = await migrateTaskDescription(row.id, descTrim);
    if (mig.note) notesOut = [mig.note];
  }

  revalidatePath(`/projekter/${projectId}`);
  return {
    id: row.id,
    title: row.title,
    description: descTrim && notesOut.length > 0 ? null : row.description,
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
    notes: notesOut,
    todos: [],
  };
}

export async function createTodoItem(
  taskId: string | null,
  meetingId: string | null,
  content: string,
): Promise<TodoItemDTO> {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const parsed = parseOrThrow(createTodoItemSchema, {
    taskId,
    meetingId,
    content,
  });

  if (parsed.taskId) {
    const t = await prisma.task.findFirst({
      where: { id: parsed.taskId, project: projectAccessWhere(user.id) },
      select: { id: true, projectId: true },
    });
    if (!t) throw new Error("Opgave ikke fundet.");

    const maxOrder = await prisma.todoItem.aggregate({
      where: { taskId: t.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const row = await prisma.todoItem.create({
      data: { content: parsed.content, taskId: t.id, sortOrder },
    });
    revalidatePath(`/projekter/${t.projectId}`);
    return mapTodoItem(row);
  }

  const m = await prisma.calendarEvent.findFirst({
    where: { id: parsed.meetingId!, userId: user.id },
    select: { id: true, projectId: true },
  });
  if (!m) throw new Error("Møde ikke fundet.");

  const maxOrderM = await prisma.todoItem.aggregate({
    where: { meetingId: m.id },
    _max: { sortOrder: true },
  });
  const sortOrderM = (maxOrderM._max.sortOrder ?? -1) + 1;

  const row = await prisma.todoItem.create({
    data: { content: parsed.content, meetingId: m.id, sortOrder: sortOrderM },
  });
  revalidateAfterTodoChange({ kind: "meeting", projectId: m.projectId });
  return mapTodoItem(row);
}

export async function toggleTodoItem(todoId: string): Promise<{ done: boolean }> {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const id = parseOrThrow(cuidLikeSchema, todoId);
  const access = await assertTodoAccess(id, user.id);
  const cur = await prisma.todoItem.findUnique({
    where: { id },
    select: { done: true },
  });
  if (!cur) throw new Error("To-do ikke fundet.");

  await prisma.todoItem.update({
    where: { id },
    data: { done: !cur.done },
  });
  revalidateAfterTodoChange(access);
  return { done: !cur.done };
}

export async function deleteTodoItem(todoId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const id = parseOrThrow(cuidLikeSchema, todoId);
  const access = await assertTodoAccess(id, user.id);
  await prisma.todoItem.delete({ where: { id } });
  revalidateAfterTodoChange(access);
}

export async function updateTodoItem(todoId: string, content: string): Promise<TodoItemDTO> {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const parsed = parseOrThrow(updateTodoItemSchema, { todoId, content });
  const access = await assertTodoAccess(parsed.todoId, user.id);

  const row = await prisma.todoItem.update({
    where: { id: parsed.todoId },
    data: { content: parsed.content },
  });
  revalidateAfterTodoChange(access);
  return mapTodoItem(row);
}

export async function reorderTodoItems(
  taskId: string | null,
  meetingId: string | null,
  orderedIds: string[],
): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const parsed = parseOrThrow(reorderTodoItemsSchema, {
    taskId,
    meetingId,
    orderedIds,
  });

  if (parsed.taskId) {
    const t = await prisma.task.findFirst({
      where: { id: parsed.taskId, project: projectAccessWhere(user.id) },
      select: { id: true, projectId: true },
    });
    if (!t) throw new Error("Opgave ikke fundet.");

    const existing = await prisma.todoItem.findMany({
      where: { taskId: t.id },
      select: { id: true },
    });
    const set = new Set(existing.map((e) => e.id));
    if (parsed.orderedIds.length !== set.size || parsed.orderedIds.some((id) => !set.has(id))) {
      throw new Error("Ugyldig rækkefølge.");
    }

    await prisma.$transaction(
      parsed.orderedIds.map((id, index) =>
        prisma.todoItem.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    revalidatePath(`/projekter/${t.projectId}`);
    return;
  }

  const m = await prisma.calendarEvent.findFirst({
    where: { id: parsed.meetingId!, userId: user.id },
    select: { id: true, projectId: true },
  });
  if (!m) throw new Error("Møde ikke fundet.");

  const existing = await prisma.todoItem.findMany({
    where: { meetingId: m.id },
    select: { id: true },
  });
  const set = new Set(existing.map((e) => e.id));
  if (parsed.orderedIds.length !== set.size || parsed.orderedIds.some((id) => !set.has(id))) {
    throw new Error("Ugyldig rækkefølge.");
  }

  await prisma.$transaction(
    parsed.orderedIds.map((id, index) =>
      prisma.todoItem.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
  revalidateAfterTodoChange({ kind: "meeting", projectId: m.projectId });
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

/** Upload a project file via Storage (service role) and persist the DB row. */
export async function uploadProjectFile(formData: FormData) {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  const projectIdRaw = formData.get("projectId");
  const file = formData.get("file");
  if (typeof projectIdRaw !== "string" || !(file instanceof File)) {
    throw new Error("Ugyldig anmodning.");
  }

  const projectId = parseOrThrow(cuidLikeSchema, projectIdRaw);

  const checked = validateUploadFile({
    size: file.size,
    name: file.name,
    type: file.type,
  });
  if (!checked.ok) {
    throw new Error(checked.reason);
  }

  await assertProjectMember(projectId, user.id);
  await ensureAppUser(user);

  const storagePath = `${projectId}/${randomUUID()}.${checked.ext}`;

  await ensureProjectFilesBucket();
  const admin = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType =
    file.type && (ALLOWED_TYPES as readonly string[]).includes(file.type)
      ? file.type
      : mimeFromExt(checked.ext);

  const { error } = await admin.storage.from(SUPABASE_STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(error.message || "Fil-upload til Storage fejlede.");
  }

  const fileTypeToStore =
    file.type && (ALLOWED_TYPES as readonly string[]).includes(file.type)
      ? file.type
      : mimeFromExt(checked.ext);

  await prisma.$transaction(async (tx) => {
    const row = await tx.file.create({
      data: {
        projectId,
        name: sanitizeOriginalFilename(file.name),
        fileType: fileTypeToStore,
        url: PRIVATE_FILE_PLACEHOLDER,
        storagePath,
        uploadedById: user.id,
      },
    });
    await tx.file.update({
      where: { id: row.id },
      data: { url: `/api/files/${row.id}/signed` },
    });
  });

  revalidatePath(`/projekter/${projectId}`);
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

/** Signed URL for a visual (1 hour). Verifies project access via storage path. */
export async function getSignedVisualUrl(storagePath: string): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const v = await prisma.visual.findFirst({
    where: { storagePath, project: projectAccessWhere(user.id) },
    select: { id: true },
  });
  if (!v) throw new Error("Ingen adgang.");

  const signed = await createSignedStorageUrl(storagePath, 3600);
  if ("error" in signed) throw new Error(signed.error);
  return signed.signedUrl;
}

export async function uploadVisual(formData: FormData) {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  const projectIdRaw = formData.get("projectId");
  const file = formData.get("file");
  if (typeof projectIdRaw !== "string" || !(file instanceof File)) {
    throw new Error("Ugyldig anmodning.");
  }

  const projectId = parseOrThrow(cuidLikeSchema, projectIdRaw);

  const checked = validateVisualUpload({
    size: file.size,
    name: file.name,
    type: file.type,
  });
  if (!checked.ok) {
    throw new Error(checked.reason);
  }

  await assertProjectMember(projectId, user.id);
  await ensureAppUser(user);

  const storagePath = `visuals/${projectId}/${randomUUID()}.${checked.ext}`;

  await ensureProjectFilesBucket();
  const admin = getSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType =
    checked.ext === "svg"
      ? "image/svg+xml"
      : checked.ext === "png"
        ? "image/png"
        : "image/jpeg";

  const { error } = await admin.storage.from(SUPABASE_STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    console.error("Storage upload error (visual):", error);
    throw new Error(error.message || "Upload af visual fejlede.");
  }

  const fileTypeToStore = contentType;

  const row = await prisma.$transaction(async (tx) => {
    const maxOrder = await tx.visual.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const created = await tx.visual.create({
      data: {
        projectId,
        name: sanitizeOriginalFilename(file.name),
        fileType: fileTypeToStore,
        url: PRIVATE_FILE_PLACEHOLDER,
        storagePath,
        uploadedById: user.id,
        sortOrder: nextOrder,
      },
    });
    return tx.visual.update({
      where: { id: created.id },
      data: { url: `/api/visuals/${created.id}/signed` },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true, image: true } },
      },
    });
  });

  revalidatePath(`/projekter/${projectId}`);
  return {
    id: row.id,
    name: row.name,
    fileType: row.fileType,
    url: row.url,
    storagePath: row.storagePath,
    createdAt: row.createdAt.toISOString(),
    sortOrder: row.sortOrder,
    uploadedBy: row.uploadedBy,
  };
}

export async function reorderVisuals(visualIds: string[]) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const ids = parseOrThrow(reorderVisualsSchema, visualIds);
  if (ids.length === 0) return;

  const first = await prisma.visual.findFirst({
    where: { id: ids[0], project: projectAccessWhere(user.id) },
    select: { projectId: true },
  });
  if (!first) throw new Error("Visual ikke fundet.");

  const projectId = first.projectId;

  const allInProject = await prisma.visual.findMany({
    where: { projectId },
    select: { id: true },
  });
  const projectIdSet = new Set(allInProject.map((v) => v.id));
  if (ids.length !== projectIdSet.size) throw new Error("Ugyldig anmodning.");
  if (new Set(ids).size !== ids.length) throw new Error("Ugyldig anmodning.");
  for (const id of ids) {
    if (!projectIdSet.has(id)) throw new Error("Ugyldig anmodning.");
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.visual.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  revalidatePath(`/projekter/${projectId}`);
}

export async function deleteVisual(visualId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  parseOrThrow(cuidLikeSchema, visualId);

  const visual = await prisma.visual.findFirst({
    where: { id: visualId, project: projectAccessWhere(user.id) },
    select: { id: true, projectId: true, storagePath: true },
  });
  if (!visual) throw new Error("Visual ikke fundet.");

  await prisma.visual.delete({ where: { id: visualId } });
  if (visual.storagePath) {
    const removed = await removeStorageObject(visual.storagePath);
    if (!removed.ok) {
      console.error("[deleteVisual] storage remove failed", visual.storagePath);
    }
  }
  revalidatePath(`/projekter/${visual.projectId}`);
}
