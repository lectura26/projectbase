"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { projectAccessWhere } from "@/lib/projekter/project-access";

export async function setFocusProject(projectId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const project = await prisma.project.findFirst({
    where: { id: projectId, ...projectAccessWhere(user.id) },
    select: { id: true },
  });
  if (!project) throw new Error("Projekt ikke fundet.");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      focusProjectId: projectId,
      focusDate: new Date(),
    },
  });

  revalidatePath("/oversigt");
}
