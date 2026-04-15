import {
  AppRole,
  NotifyPreference,
  Priority,
  ProjectStatus,
  ProjectVisibility,
  RoutineInterval,
  TaskStatus,
} from "@prisma/client";
import { z } from "zod";
import { isAllowedProjectColor } from "@/lib/projekter/project-colors";
import { ALLOWED_TYPES, MAX_FILE_BYTES } from "@/lib/storage/file-validation";

/** Project / task / comment text limits (defense-in-depth with DB). */
export const MAX_PROJECT_NAME = 200;
export const MAX_PROJECT_DESCRIPTION = 5000;
export const MAX_TASK_TITLE = 200;
export const MAX_COMMENT = 5000;
export const MAX_TAG_LEN = 64;
export const MAX_TAGS = 50;
export const MAX_CONTACT_LEN = 320;
export const MAX_ACCOUNT_NAME = 200;
export const MAX_CALENDAR_TITLE = 200;

const priorityZ = z.nativeEnum(Priority);
const visibilityZ = z.nativeEnum(ProjectVisibility);
const routineZ = z.nativeEnum(RoutineInterval);
const taskStatusZ = z.nativeEnum(TaskStatus);
const projectStatusZ = z.nativeEnum(ProjectStatus);
const appRoleZ = z.nativeEnum(AppRole);
const notifyPrefZ = z.nativeEnum(NotifyPreference);

/** Supabase Auth user id = application User.id */
export const uuidSchema = z.string().uuid();

/** @default(cuid()) — projects, tasks, files, notifications, … */
export const cuidLikeSchema = z.string().regex(/^c[a-z0-9]{8,35}$/);

const trimmedName = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1).max(MAX_PROJECT_NAME));

export const projectNameSchema = trimmedName;

/** POST /api/projects JSON body */
const optionalProjectColorZ = z
  .string()
  .optional()
  .transform((s) => (s?.trim() ? s.trim() : undefined))
  .refine((v) => v === undefined || isAllowedProjectColor(v), "Ugyldig projektfarve");

export const apiProjectCreateSchema = z.object({
  name: trimmedName,
  description: z.union([z.string().max(MAX_PROJECT_DESCRIPTION), z.null()]).optional(),
  deadline: z.union([z.string(), z.null()]).optional(),
  priority: priorityZ,
  visibility: visibilityZ,
  tags: z.array(z.string().max(MAX_TAG_LEN)).max(MAX_TAGS).default([]),
  isRoutine: z.boolean().optional(),
  contactName: z.string().max(MAX_CONTACT_LEN).optional(),
  contactEmail: z.string().max(MAX_CONTACT_LEN).optional(),
  color: optionalProjectColorZ,
});

export type ApiProjectCreate = z.infer<typeof apiProjectCreateSchema>;

/** Server action: create project */
export const createProjectActionSchema = z.object({
  name: trimmedName,
  description: z.string().max(MAX_PROJECT_DESCRIPTION).optional(),
  startDate: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  priority: priorityZ,
  visibility: visibilityZ,
  tags: z.array(z.string().max(MAX_TAG_LEN)).max(MAX_TAGS).default([]),
  isRoutine: z.boolean(),
  routineInterval: routineZ.nullable().optional(),
  contactName: z.string().max(MAX_CONTACT_LEN).optional(),
  contactEmail: z.string().max(MAX_CONTACT_LEN).optional(),
  color: optionalProjectColorZ,
  status: projectStatusZ.optional(),
});

export const updateProjectActionSchema = createProjectActionSchema.extend({
  projectId: cuidLikeSchema,
});

export const updateProjectScheduleSchema = z.object({
  startDate: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
});

export const updateProjectScheduleActionSchema = updateProjectScheduleSchema.extend({
  projectId: cuidLikeSchema,
});

export const updateProjectStatusSchema = z.object({
  projectId: cuidLikeSchema,
  status: projectStatusZ,
});

export const updateProjectPrioritySchema = z.object({
  projectId: cuidLikeSchema,
  priority: priorityZ,
});

export const ganttTasksForProjectSchema = z.object({
  projectId: cuidLikeSchema,
});

const trimmedTaskTitle = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1).max(MAX_TASK_TITLE));

export const createTaskActionSchema = z.object({
  title: trimmedTaskTitle,
  description: z.string().max(MAX_PROJECT_DESCRIPTION).optional().nullable(),
  startDate: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  userId: z.union([uuidSchema, z.null()]).optional(),
  priority: priorityZ.optional(),
});

export const updateTaskFieldsSchema = z.object({
  taskId: cuidLikeSchema,
  description: z.string().max(MAX_PROJECT_DESCRIPTION).optional().nullable(),
  startDate: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  userId: z.union([uuidSchema, z.null()]).optional(),
  priority: priorityZ.optional(),
});

export const updateTaskTitleSchema = z.object({
  taskId: cuidLikeSchema,
  title: trimmedTaskTitle,
});

export const commentContentSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1).max(MAX_COMMENT));

export const createTaskNoteSchema = z.object({
  taskId: cuidLikeSchema,
  content: commentContentSchema,
});

export const createMeetingNoteSchema = z.object({
  meetingId: cuidLikeSchema,
  content: commentContentSchema,
});

export const createMeetingCommentSchema = z.object({
  meetingId: cuidLikeSchema,
  content: commentContentSchema,
});

export const todoContentSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1).max(MAX_COMMENT));

export const createTodoItemSchema = z
  .object({
    taskId: cuidLikeSchema.nullable(),
    meetingId: cuidLikeSchema.nullable(),
    content: todoContentSchema,
  })
  .refine(
    (d) =>
      (d.taskId != null && d.meetingId == null) ||
      (d.taskId == null && d.meetingId != null),
    { message: "Angiv enten opgave eller møde." },
  );

export const updateMeetingFieldSchema = z.object({
  meetingId: cuidLikeSchema,
  field: z.enum(["title", "date", "startTime", "endTime"]),
  value: z.union([z.string(), z.null()]),
});

const allowedFileMimeSchema = z
  .string()
  .refine(
    (s) => (ALLOWED_TYPES as readonly string[]).includes(s),
    "Filtype ikke tilladt.",
  );

export const projectFileRecordSchema = z.object({
  projectId: cuidLikeSchema,
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(255)),
  fileType: allowedFileMimeSchema,
  storagePath: z.string().min(1).max(512),
});

export const updateMyAccountSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(MAX_ACCOUNT_NAME)),
  notifyPreference: notifyPrefZ,
});

export const inviteTeamMemberSchema = z.object({
  email: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.string().email().max(320)),
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(200)),
  appRole: appRoleZ,
});

export const notificationIdSchema = cuidLikeSchema;

export const setTaskStatusSchema = z.object({
  taskId: cuidLikeSchema,
  status: taskStatusZ,
});

export { MAX_FILE_BYTES };
