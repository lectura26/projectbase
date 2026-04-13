"use server";

import { revalidatePath } from "next/cache";
import type {
  Priority,
  ProjectStatus,
  ProjectVisibility,
  RoutineInterval,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { getSessionUser } from "@/lib/auth/session-user";
import { createNotification } from "@/lib/notifications/service";
import { nextAssignedColorForUser } from "@/lib/projekter/assign-project-color";
import { isAllowedProjectColor } from "@/lib/projekter/project-colors";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import { ymdStringToDateOrNull } from "@/lib/datetime/ymd";
import { deadlineFromRoutineInterval } from "@/lib/projekter/routine";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  createProjectActionSchema,
  updateProjectActionSchema,
  updateProjectScheduleActionSchema,
  updateProjectStatusSchema,
} from "@/lib/validation/schemas";

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus,
): Promise<{
  ok: true;
  routineRestarted?: { name: string; projectId: string };
}> {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  parseOrThrow(updateProjectStatusSchema, { projectId, status });

  const project = await prisma.project.findFirst({
    where: { id: projectId, ...projectAccessWhere(user.id) },
    include: {
      contacts: true,
      members: true,
      tasks: true,
    },
  });
  if (!project) throw new Error("Projekt ikke fundet eller ingen adgang.");

  await prisma.project.update({
    where: { id: projectId },
    data: { status },
  });

  let routineRestarted: { name: string; projectId: string } | undefined;

  if (
    status === "COMPLETED" &&
    project.isRoutine &&
    project.routineInterval &&
    project.userId === user.id
  ) {
    const newDeadline = deadlineFromRoutineInterval(project.routineInterval);
    const newProject = await prisma.project.create({
      data: {
        name: project.name,
        description: project.description,
        status: "NOT_STARTED",
        priority: project.priority,
        visibility: project.visibility,
        deadline: newDeadline,
        userId: project.userId,
        color: project.color,
        isRoutine: true,
        routineInterval: project.routineInterval,
        tags: project.tags,
        contacts: {
          create: project.contacts.map((c) => ({
            name: c.name,
            email: c.email,
          })),
        },
        members: {
          create: project.members.map((m) => ({ userId: m.userId })),
        },
        tasks: {
          create: project.tasks.map((t) => ({
            title: t.title,
            description: t.description,
            status: "TODO",
            priority: t.priority,
            userId: t.userId,
            startDate: null,
            deadline: null,
          })),
        },
      },
    });
    routineRestarted = { name: project.name, projectId: newProject.id };

    const notifyTargets = new Set<string>();
    notifyTargets.add(project.userId);
    for (const m of project.members) notifyTargets.add(m.userId);
    const msg = `Rutineprojekt genstartet: ${project.name}`;
    for (const uid of Array.from(notifyTargets)) {
      await createNotification({
        userId: uid,
        type: "ROUTINE_RESTARTED",
        message: msg,
        relatedProjectId: newProject.id,
      });
    }
  }

  revalidatePath("/projekter");
  revalidatePath(`/projekter/${projectId}`);
  return { ok: true, routineRestarted };
}

export type CreateProjectInput = {
  name: string;
  description?: string;
  startDate?: string | null;
  deadline?: string | null;
  priority: Priority;
  visibility: ProjectVisibility;
  tags: string[];
  isRoutine: boolean;
  routineInterval?: RoutineInterval | null;
  contactName?: string;
  contactEmail?: string;
  /** Opretter en ekstra skabelon-række (vises under Indstillinger). */
  saveAsTemplate?: boolean;
  /** Must be one of PROJECT_COLORS; otherwise server assigns next free color. */
  color?: string;
};

export type UpdateProjectInput = CreateProjectInput & {
  projectId: string;
};

/** Pre-fill for edit modal (dates as `YYYY-MM-DD`). */
export type EditProjectInitial = {
  name: string;
  description: string;
  startDate: string;
  deadline: string;
  priority: Priority;
  visibility: ProjectVisibility;
  tags: string[];
  isRoutine: boolean;
  routineInterval: RoutineInterval | null;
  contactName: string;
  contactEmail: string;
  color: string;
};

export async function updateProject(input: UpdateProjectInput) {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  const parsed = parseOrThrow(updateProjectActionSchema, input);

  const project = await prisma.project.findFirst({
    where: { id: parsed.projectId, userId: user.id },
  });
  if (!project) throw new Error("Projekt ikke fundet eller ingen adgang.");

  await ensureAppUser(user);

  const description = parsed.description?.trim() || null;
  const contactName = parsed.contactName?.trim();
  const contactEmail = parsed.contactEmail?.trim();

  const nextColor =
    parsed.color !== undefined && isAllowedProjectColor(parsed.color)
      ? parsed.color
      : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: parsed.projectId },
      data: {
        name: parsed.name,
        description,
        startDate: ymdStringToDateOrNull(parsed.startDate ?? ""),
        deadline: ymdStringToDateOrNull(parsed.deadline ?? ""),
        priority: parsed.priority,
        visibility: parsed.visibility,
        tags: parsed.tags.filter(Boolean),
        isRoutine: parsed.isRoutine,
        routineInterval: parsed.isRoutine ? parsed.routineInterval ?? "MONTHLY" : null,
        ...(nextColor !== undefined ? { color: nextColor } : {}),
      },
    });
    await tx.contact.deleteMany({ where: { projectId: parsed.projectId } });
    if (contactName && contactEmail) {
      await tx.contact.create({
        data: {
          projectId: parsed.projectId,
          name: contactName,
          email: contactEmail,
        },
      });
    }
  });

  revalidatePath("/projekter");
  revalidatePath(`/projekter/${parsed.projectId}`);
}

export async function updateProjectSchedule(
  projectId: string,
  data: { startDate?: string | null; deadline?: string | null },
) {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  const parsed = parseOrThrow(updateProjectScheduleActionSchema, { projectId, ...data });

  const project = await prisma.project.findFirst({
    where: { id: parsed.projectId, userId: user.id },
  });
  if (!project) throw new Error("Projekt ikke fundet eller ingen adgang.");

  await prisma.project.update({
    where: { id: parsed.projectId },
    data: {
      ...(parsed.startDate !== undefined && {
        startDate: ymdStringToDateOrNull(parsed.startDate),
      }),
      ...(parsed.deadline !== undefined && {
        deadline: ymdStringToDateOrNull(parsed.deadline),
      }),
    },
  });

  revalidatePath("/projekter");
  revalidatePath(`/projekter/${parsed.projectId}`);
}

export async function createProject(input: CreateProjectInput) {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  const parsed = parseOrThrow(createProjectActionSchema, input);

  await ensureAppUser(user);

  const description = parsed.description?.trim() || null;
  const contactName = parsed.contactName?.trim();
  const contactEmail = parsed.contactEmail?.trim();

  const colorHex =
    parsed.color !== undefined && isAllowedProjectColor(parsed.color)
      ? parsed.color
      : await nextAssignedColorForUser(user.id);

  await prisma.project.create({
    data: {
      name: parsed.name,
      userId: user.id,
      color: colorHex,
      description,
      startDate: ymdStringToDateOrNull(parsed.startDate ?? ""),
      deadline: ymdStringToDateOrNull(parsed.deadline ?? ""),
      priority: parsed.priority,
      visibility: parsed.visibility,
      tags: parsed.tags.filter(Boolean),
      isRoutine: parsed.isRoutine,
      routineInterval: parsed.isRoutine ? parsed.routineInterval ?? "MONTHLY" : null,
      ...(contactName && contactEmail
        ? {
            contacts: {
              create: [{ name: contactName, email: contactEmail }],
            },
          }
        : {}),
    },
  });

  if (parsed.saveAsTemplate) {
    await prisma.project.create({
      data: {
        name: `${parsed.name} (skabelon)`,
        userId: user.id,
        color: colorHex,
        description,
        startDate: null,
        deadline: null,
        priority: parsed.priority,
        visibility: parsed.visibility,
        tags: parsed.tags.filter(Boolean),
        isRoutine: false,
        routineInterval: null,
        isTemplate: true,
        ...(contactName && contactEmail
          ? {
              contacts: {
                create: [{ name: contactName, email: contactEmail }],
              },
            }
          : {}),
      },
    });
    revalidatePath("/indstillinger");
  }

  revalidatePath("/projekter");
}
