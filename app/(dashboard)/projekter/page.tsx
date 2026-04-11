import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProjekterPageClient from "@/components/projekter/ProjekterPageClient";
import type { ProjectListItem } from "@/types/projekter";
import { getSessionUser } from "@/lib/auth/session-user";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projekter",
};

export default async function ProjekterPage() {
  const user = await getSessionUser();
  if (!user?.email) {
    redirect("/login");
  }

  await ensureAppUser(user);

  const rows = await prisma.project.findMany({
    where: { userId: user.id, isTemplate: false },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      contacts: { select: { id: true, name: true } },
      tasks: { select: { status: true } },
    },
  });

  const prismaUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true },
  });

  const selfLabel = prismaUser?.name ?? prismaUser?.email ?? user.email;

  const ownerOptions = Array.from(
    new Map(
      rows.map((r) => [
        r.user.id,
        {
          id: r.user.id,
          name: r.user.name ?? r.user.email,
        },
      ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "da"));

  const initialProjects: ProjectListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    priority: r.priority,
    deadline: r.deadline ? r.deadline.toISOString() : null,
    isRoutine: r.isRoutine,
    routineInterval: r.routineInterval,
    createdAt: r.createdAt.toISOString(),
    owner: { id: r.user.id, name: r.user.name ?? r.user.email },
    contacts: r.contacts,
    tasks: r.tasks,
  }));

  const usersForCreate = [
    {
      id: user.id,
      email: prismaUser?.email ?? user.email,
      name: selfLabel,
    },
  ];

  return (
    <ProjekterPageClient
      initialProjects={initialProjects}
      ownerOptions={ownerOptions}
      usersForCreate={usersForCreate}
      currentUserId={user.id}
    />
  );
}
