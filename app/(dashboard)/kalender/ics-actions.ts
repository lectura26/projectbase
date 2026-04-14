"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import { parseOrThrow } from "@/lib/validation/parse";
import { cuidLikeSchema } from "@/lib/validation/schemas";

export async function linkIcsEventToProject(
  eventId: string,
  projectId: string | null,
): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const eid = parseOrThrow(cuidLikeSchema, eventId);

  const row = await prisma.icsEvent.findFirst({
    where: { id: eid, userId: user.id },
    select: { id: true },
  });
  if (!row) throw new Error("Begivenhed ikke fundet.");

  if (projectId === null) {
    await prisma.icsEvent.update({
      where: { id: eid },
      data: { projectId: null },
    });
    revalidatePath("/kalender");
    revalidatePath("/oversigt");
    return;
  }

  const pid = parseOrThrow(cuidLikeSchema, projectId);
  const project = await prisma.project.findFirst({
    where: { id: pid, ...projectAccessWhere(user.id) },
    select: { id: true },
  });
  if (!project) throw new Error("Projekt ikke fundet.");

  await prisma.icsEvent.update({
    where: { id: eid },
    data: { projectId: pid },
  });

  revalidatePath("/kalender");
  revalidatePath("/oversigt");
}
