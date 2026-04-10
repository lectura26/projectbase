import type { User as AuthUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

/**
 * Keeps `User` in sync with Supabase Auth (`id` is `auth.users.id`).
 */
export async function ensureAppUser(authUser: AuthUser) {
  const email = authUser.email;
  if (!email) return;

  const name =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    null;
  const image =
    (authUser.user_metadata?.avatar_url as string | undefined) ??
    (authUser.user_metadata?.picture as string | undefined) ??
    null;

  await prisma.user.upsert({
    where: { id: authUser.id },
    create: {
      id: authUser.id,
      email,
      name,
      image,
    },
    update: {
      email,
      name,
      image,
    },
  });
}
