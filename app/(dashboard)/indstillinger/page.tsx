import type { Metadata } from "next";
import { redirect } from "next/navigation";
import IndstillingerPageClient from "@/components/indstillinger/IndstillingerPageClient";
import { getSessionUser } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Indstillinger",
};

export default async function IndstillingerPage() {
  const user = await getSessionUser();
  if (!user?.email) redirect("/login");

  await ensureAppUser(user);

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      appRole: true,
      notifyPreference: true,
      aiMatchSensitivity: true,
    },
  });

  if (!row) redirect("/login");

  const isAdmin = row.appRole === "ADMIN";

  const [members, templates, pendingInvites] = isAdmin
    ? await Promise.all([
        prisma.user.findMany({
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true, appRole: true },
        }),
        prisma.project.findMany({
          where: { isTemplate: true },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true },
        }),
        prisma.pendingTeamMember.findMany({
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            name: true,
            appRole: true,
          },
        }),
      ])
    : [[], [], []];

  return (
    <IndstillingerPageClient
      user={row}
      isAdmin={isAdmin}
      members={members}
      templates={templates}
      pendingInvites={pendingInvites}
    />
  );
}
