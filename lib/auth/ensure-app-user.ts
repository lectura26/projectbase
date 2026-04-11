import type { User as AuthUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

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

  try {
    await prisma.user.upsert({
      where: { id: authUser.id },
      create: {
        id: authUser.id,
        email: normalizedEmail,
        name: displayName ?? email,
        image: image ?? null,
        ...(invitedRole ? { appRole: invitedRole } : {}),
      },
      update: {
        email: normalizedEmail,
        name: displayName ?? metaName ?? undefined,
        image: image ?? undefined,
        ...(invitedRole ? { appRole: invitedRole } : {}),
      },
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== "P2002") throw err;
  }

  if (pending) {
    await prisma.pendingTeamMember.delete({ where: { id: pending.id } });
  }
}
