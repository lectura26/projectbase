"use server";

import type { AppRole, NotifyPreference } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session-user";
import { rateLimitAllow } from "@/lib/rate-limit";
import { removeStorageObject } from "@/lib/supabase/storage-remove";
import { parseOrThrow } from "@/lib/validation/parse";
import {
  cuidLikeSchema,
  inviteTeamMemberSchema,
  updateMyAccountSchema,
  uuidSchema,
} from "@/lib/validation/schemas";

const INVITE_WINDOW_MS = 3_600_000;
const INVITE_MAX = 40;

const DELETE_ACCOUNT_WINDOW_MS = 86_400_000;
const DELETE_ACCOUNT_MAX = 3;

async function clearSupabaseAuthCookies() {
  const store = await cookies();
  for (const c of store.getAll()) {
    if (c.name.startsWith("sb-") && c.name.includes("auth")) {
      store.delete(c.name);
    }
  }
}

export async function updateMyAccount(input: {
  name: string;
  notifyPreference: NotifyPreference;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const parsed = parseOrThrow(updateMyAccountSchema, input);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.name,
      notifyPreference: parsed.notifyPreference,
    },
  });

  revalidatePath("/indstillinger");
}

export async function updateMemberRole(memberId: string, appRole: AppRole) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const mid = parseOrThrow(cuidLikeSchema, memberId);

  const admin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { appRole: true },
  });
  if (admin?.appRole !== "ADMIN") throw new Error("Kun administratorer kan ændre roller.");

  if (mid === user.id) throw new Error("Du kan ikke ændre din egen rolle her.");

  await prisma.user.update({
    where: { id: mid },
    data: { appRole },
  });

  revalidatePath("/indstillinger");
}

export async function removeTeamMember(memberId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const mid = parseOrThrow(uuidSchema, memberId);

  const admin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { appRole: true },
  });
  if (admin?.appRole !== "ADMIN") throw new Error("Kun administratorer.");

  if (mid === user.id) throw new Error("Du kan ikke fjerne dig selv.");

  const target = await prisma.user.findUnique({
    where: { id: mid },
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

  await prisma.user.delete({ where: { id: mid } });

  revalidatePath("/indstillinger");
}

export async function inviteTeamMember(input: {
  email: string;
  name: string;
  appRole: AppRole;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  if (!rateLimitAllow(`team-invite:${user.id}`, INVITE_MAX, INVITE_WINDOW_MS)) {
    throw new Error("For mange invitationer. Prøv igen senere.");
  }

  const admin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { appRole: true },
  });
  if (admin?.appRole !== "ADMIN") throw new Error("Kun administratorer.");

  const parsed = parseOrThrow(inviteTeamMemberSchema, input);

  const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { appRole: parsed.appRole, name: parsed.name || existing.name },
    });
    revalidatePath("/indstillinger");
    return { ok: true as const, mode: "updated" as const };
  }

  await prisma.pendingTeamMember.upsert({
    where: { email: parsed.email },
    create: {
      email: parsed.email,
      name: parsed.name,
      appRole: parsed.appRole,
      invitedById: user.id,
    },
    update: {
      name: parsed.name,
      appRole: parsed.appRole,
      invitedById: user.id,
    },
  });

  revalidatePath("/indstillinger");
  return { ok: true as const, mode: "pending" as const };
}

export async function deleteProjectTemplate(templateId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const tid = parseOrThrow(cuidLikeSchema, templateId);

  const admin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { appRole: true },
  });
  if (admin?.appRole !== "ADMIN") throw new Error("Kun administratorer.");

  const result = await prisma.project.deleteMany({
    where: { id: tid, isTemplate: true },
  });
  if (result.count === 0) throw new Error("Skabelon ikke fundet.");

  revalidatePath("/indstillinger");
}

/**
 * Deletes the current user's account and all data.
 * Requires SUPABASE_SERVICE_ROLE_KEY for auth.users removal.
 * Client should navigate to /login after success (redirect() throws and breaks try/catch).
 */
export async function deleteUserAccount(userId: string): Promise<{ ok: true }> {
  const session = await getSessionUser();
  if (!session) throw new Error("Ikke logget ind.");

  const id = parseOrThrow(uuidSchema, userId);
  if (id !== session.id) throw new Error("Ugyldig anmodning.");

  if (!rateLimitAllow(`delete-account:${id}`, DELETE_ACCOUNT_MAX, DELETE_ACCOUNT_WINDOW_MS)) {
    throw new Error("For mange forsøg. Prøv igen senere.");
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("Kontosletning er ikke konfigureret (mangler service role).");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Kontosletning er ikke konfigureret.");

  const filesToPurge = await prisma.file.findMany({
    where: {
      OR: [{ uploadedById: id }, { project: { userId: id } }],
    },
    select: { storagePath: true },
  });
  for (const f of filesToPurge) {
    if (f.storagePath) {
      await removeStorageObject(f.storagePath);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { userId: id } });
    await tx.comment.deleteMany({ where: { authorId: id } });
    await tx.projectMember.deleteMany({ where: { userId: id } });
    await tx.pendingTeamMember.deleteMany({ where: { invitedById: id } });
    await tx.task.updateMany({ where: { userId: id }, data: { userId: null } });
    await tx.file.deleteMany({ where: { uploadedById: id } });
    await tx.project.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    console.error("[deleteUserAccount] auth delete failed", error.message);
    throw new Error("Kunne ikke slette login. Kontakt support.");
  }

  await clearSupabaseAuthCookies();
  revalidatePath("/", "layout");
  return { ok: true };
}
