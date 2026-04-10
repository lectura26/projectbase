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
import { projectAccessWhere } from "@/lib/projekter/project-access";
import { deadlineFromRoutineInterval } from "@/lib/projekter/routine";

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus,
): Promise<{
  ok: true;
  routineRestarted?: { name: string; projectId: string };
}> {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

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
};

export type UpdateProjectInput = CreateProjectInput & {
  projectId: string;
};

/** Pre-fill for edit modal (dates as `YYYY-MM-DD` for `<input type="date">`). */
export type EditProjectInitial = {
  name: string;
  description: string;
  deadline: string;
  priority: Priority;
  visibility: ProjectVisibility;
  tags: string[];
  isRoutine: boolean;
  routineInterval: RoutineInterval | null;
  contactName: string;
  contactEmail: string;
};

export async function updateProject(input: UpdateProjectInput) {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  const name = input.name.trim();
  if (!name) throw new Error("Projektnavn er påkrævet.");

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, userId: user.id },
  });
  if (!project) throw new Error("Projekt ikke fundet eller ingen adgang.");

  await ensureAppUser(user);

  const description = input.description?.trim() || null;
  const contactName = input.contactName?.trim();
  const contactEmail = input.contactEmail?.trim();

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: input.projectId },
      data: {
        name,
        description,
        deadline: input.deadline ? new Date(input.deadline) : null,
        priority: input.priority,
        visibility: input.visibility,
        tags: input.tags.filter(Boolean),
        isRoutine: input.isRoutine,
        routineInterval: input.isRoutine ? input.routineInterval ?? "MONTHLY" : null,
      },
    });
    await tx.contact.deleteMany({ where: { projectId: input.projectId } });
    if (contactName && contactEmail) {
      await tx.contact.create({
        data: {
          projectId: input.projectId,
          name: contactName,
          email: contactEmail,
        },
      });
    }
  });

  revalidatePath("/projekter");
  revalidatePath(`/projekter/${input.projectId}`);
}

export async function createProject(input: CreateProjectInput) {
  const user = await getSessionUser();
  if (!user?.email) throw new Error("Ikke logget ind.");

  const name = input.name.trim();
  if (!name) throw new Error("Projektnavn er påkrævet.");

  await ensureAppUser(user);

  const description = input.description?.trim() || null;
  const contactName = input.contactName?.trim();
  const contactEmail = input.contactEmail?.trim();

  await prisma.project.create({
    data: {
      name,
      userId: user.id,
      description,
      deadline: input.deadline ? new Date(input.deadline) : null,
      priority: input.priority,
      visibility: input.visibility,
      tags: input.tags.filter(Boolean),
      isRoutine: input.isRoutine,
      routineInterval: input.isRoutine ? input.routineInterval ?? "MONTHLY" : null,
      ...(contactName && contactEmail
        ? {
            contacts: {
              create: [{ name: contactName, email: contactEmail }],
            },
          }
        : {}),
    },
  });

  if (input.saveAsTemplate) {
    await prisma.project.create({
      data: {
        name: `${name} (skabelon)`,
        userId: user.id,
        description,
        deadline: null,
        priority: input.priority,
        visibility: input.visibility,
        tags: input.tags.filter(Boolean),
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
