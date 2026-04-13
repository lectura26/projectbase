import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import ProjekterPageClient from "@/components/projekter/ProjekterPageClient";
import { ProjectListSkeleton } from "@/components/projekter/ProjectListSkeleton";
import type { ProjectListItem } from "@/types/projekter";
import { getSessionUser } from "@/lib/auth/session-user";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { getCachedProjekterPageBundle } from "@/lib/data/cached-queries";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Projekter",
};

export default function ProjekterPage() {
  return (
    <Suspense fallback={<ProjectListSkeleton />}>
      <ProjekterPageContent />
    </Suspense>
  );
}

async function ProjekterPageContent() {
  const user = await getSessionUser();
  if (!user?.email) {
    redirect("/login");
  }

  await ensureAppUser(user);

  const bundle = await getCachedProjekterPageBundle(user.id);
  if (!bundle) {
    redirect("/login");
  }

  const selfLabel = bundle.name?.trim() || bundle.email || user.email;

  const mapProject = (r: (typeof bundle.activeOwnedProjects)[0]): ProjectListItem => ({
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
  });

  const initialProjects: ProjectListItem[] = bundle.activeOwnedProjects.map(mapProject);
  const initialCompletedProjects: ProjectListItem[] = bundle.completedOwnedProjects.map(mapProject);

  const usersForCreate = [
    {
      id: user.id,
      email: bundle.email,
      name: selfLabel,
    },
  ];

  return (
    <ProjekterPageClient
      initialProjects={initialProjects}
      initialCompletedProjects={initialCompletedProjects}
      usersForCreate={usersForCreate}
      currentUserId={user.id}
    />
  );
}
