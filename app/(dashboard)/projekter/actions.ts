"use server";

import { revalidatePath } from "next/cache";
import type { Priority, ProjectStatus, ProjectVisibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { getSessionUser } from "@/lib/auth/session-user";

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const result = await prisma.project.updateMany({
    where: { id: projectId, userId: user.id },
    data: { status },
  });
  if (result.count === 0) throw new Error("Projekt ikke fundet eller ingen adgang.");
  revalidatePath("/projekter");
}

export type CreateProjectInput = {
  name: string;
  description?: string;
  deadline?: string | null;
  priority: Priority;
  visibility: ProjectVisibility;
  tags: string[];
  isRoutine: boolean;
  contactName?: string;
  contactEmail?: string;
};

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
      ...(contactName && contactEmail
        ? {
            contacts: {
              create: [{ name: contactName, email: contactEmail }],
            },
          }
        : {}),
    },
  });

  revalidatePath("/projekter");
}
