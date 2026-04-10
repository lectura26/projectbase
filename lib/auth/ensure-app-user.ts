import type { User as AuthUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

/**
 * Keeps `User` in sync with Supabase Auth (`id` is `auth.users.id`).
 * Applies pending team invite (role + name) when e-mail matches.
 */
export async function ensureAppUser(authUser: AuthUser) {
  const email = authUser.email;
  if (!email) return;

  const normalizedEmail = email.toLowerCase().trim();
  const metaName =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    null;
  const image =
    (authUser.user_metadata?.avatar_url as string | undefined) ??
    (authUser.user_metadata?.picture as string | undefined) ??
    null;

  const pending = await prisma.pendingTeamMember.findUnique({
    where: { email: normalizedEmail },
  });

  const displayName = pending?.name?.trim() || metaName;
  const invitedRole = pending?.appRole;

  await prisma.user.upsert({
    where: { id: authUser.id },
    create: {
      id: authUser.id,
      email,
      name: displayName,
      image,
      ...(invitedRole ? { appRole: invitedRole } : {}),
    },
    update: {
      email,
      name: displayName ?? undefined,
      image,
      ...(invitedRole ? { appRole: invitedRole } : {}),
    },
  });

  if (pending) {
    await prisma.pendingTeamMember.delete({ where: { id: pending.id } });
  }
}
