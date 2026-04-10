"use server";

import type { AppRole, NotifyPreference } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session-user";

export async function updateMyAccount(input: {
  name: string;
  notifyPreference: NotifyPreference;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const name = input.name.trim();
  if (!name) throw new Error("Navn er påkrævet.");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      notifyPreference: input.notifyPreference,
    },
  });

  revalidatePath("/indstillinger");
}

export async function updateMemberRole(memberId: string, appRole: AppRole) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const admin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { appRole: true },
  });
  if (admin?.appRole !== "ADMIN") throw new Error("Kun administratorer kan ændre roller.");

  if (memberId === user.id) throw new Error("Du kan ikke ændre din egen rolle her.");

  await prisma.user.update({
    where: { id: memberId },
    data: { appRole },
  });

  revalidatePath("/indstillinger");
}

export async function removeTeamMember(memberId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const admin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { appRole: true },
  });
  if (admin?.appRole !== "ADMIN") throw new Error("Kun administratorer.");

  if (memberId === user.id) throw new Error("Du kan ikke fjerne dig selv.");

  const target = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      _count: {
        select: { ownedProjects: true, uploadedFiles: true, comments: true },
      },
    },
  });
  if (!target) throw new Error("Bruger ikke fundet.");
  if (target._count.ownedProjects > 0) {
    throw new Error("Brugeren ejer projekter og kan ikke slettes.");
  }
  if (target._count.uploadedFiles > 0) {
    throw new Error("Brugeren har uploadede filer og kan ikke slettes.");
  }

  await prisma.user.delete({ where: { id: memberId } });

  revalidatePath("/indstillinger");
}

export async function inviteTeamMember(input: {
  email: string;
  name: string;
  appRole: AppRole;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const admin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { appRole: true },
  });
  if (admin?.appRole !== "ADMIN") throw new Error("Kun administratorer.");

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email) throw new Error("E-mail er påkrævet.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ugyldig e-mail.");
  if (!name) throw new Error("Navn er påkrævet.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { appRole: input.appRole, name: name || existing.name },
    });
    revalidatePath("/indstillinger");
    return { ok: true as const, mode: "updated" as const };
  }

  await prisma.pendingTeamMember.upsert({
    where: { email },
    create: {
      email,
      name,
      appRole: input.appRole,
      invitedById: user.id,
    },
    update: {
      name,
      appRole: input.appRole,
      invitedById: user.id,
    },
  });

  revalidatePath("/indstillinger");
  return { ok: true as const, mode: "pending" as const };
}

export async function deleteProjectTemplate(templateId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const admin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { appRole: true },
  });
  if (admin?.appRole !== "ADMIN") throw new Error("Kun administratorer.");

  await prisma.project.deleteMany({
    where: { id: templateId, isTemplate: true },
  });

  revalidatePath("/indstillinger");
}
