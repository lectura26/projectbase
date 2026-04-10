import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ProjectDetailClient from "@/components/projekter/project-detail/ProjectDetailClient";
import { getSessionUser } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { projectCalendarColor } from "@/lib/projekter/display";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import type { ProjectDetailPayload } from "@/types/project-detail";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getSessionUser();
  if (!user) {
    return { title: "Projekt" };
  }
  const project = await prisma.project.findFirst({
    where: { id: params.id, ...projectAccessWhere(user.id) },
    select: { name: true },
  });
  return { title: project?.name ?? "Projekt" };
}

export default async function ProjectDetailPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = params;

  const row = await prisma.project.findFirst({
    where: { id, ...projectAccessWhere(user.id) },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      contacts: true,
      tasks: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              author: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      },
      comments: {
        where: { taskId: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      activities: { orderBy: { date: "desc" } },
      files: {
        orderBy: { createdAt: "desc" },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      calendarEvents: { orderBy: { date: "asc" } },
    },
  });

  if (!row) notFound();

  const initial: ProjectDetailPayload = {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    priority: row.priority,
    visibility: row.visibility,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isRoutine: row.isRoutine,
    routineInterval: row.routineInterval,
    tags: row.tags,
    calendarColor: projectCalendarColor(row.id),
    userId: row.userId,
    owner: row.user,
    members: row.members,
    contacts: row.contacts,
    tasks: row.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      deadline: t.deadline ? t.deadline.toISOString() : null,
      assignee: t.user,
      comments: t.comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
      })),
    })),
    projectComments: row.comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      author: c.author,
    })),
    activities: row.activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      source: a.source,
      organizerName: a.organizerName,
      date: a.date.toISOString(),
      autoMatched: a.autoMatched,
      confirmed: a.confirmed,
    })),
    files: row.files.map((f) => ({
      id: f.id,
      name: f.name,
      fileType: f.fileType,
      url: f.url,
      storagePath: f.storagePath,
      createdAt: f.createdAt.toISOString(),
      uploadedBy: f.uploadedBy,
    })),
    calendarEvents: row.calendarEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date.toISOString(),
      eventTime: e.eventTime,
    })),
  };

  const modalUserMap = new Map<string, { id: string; name: string; email: string }>();
  modalUserMap.set(row.user.id, {
    id: row.user.id,
    name: row.user.name ?? row.user.email,
    email: row.user.email,
  });
  for (const m of row.members) {
    modalUserMap.set(m.user.id, {
      id: m.user.id,
      name: m.user.name ?? m.user.email,
      email: m.user.email,
    });
  }
  const usersForModal = Array.from(modalUserMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "da"),
  );

  const storageBucket =
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "projectbase-files";

  return (
    <div className="space-y-4">
      <Link
        href="/projekter"
        className="inline-flex items-center gap-1 font-body text-sm font-medium text-primary hover:underline"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Tilbage til projekter
      </Link>
      <ProjectDetailClient
        initial={initial}
        usersForModal={usersForModal}
        storageBucket={storageBucket}
      />
    </div>
  );
}
