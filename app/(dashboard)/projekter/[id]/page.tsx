import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import ProjectDetailClient from "@/components/projekter/project-detail/ProjectDetailClient";
import { getSessionUser } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { projectCalendarColor } from "@/lib/projekter/display";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import type { ProjectDetailPayload } from "@/types/project-detail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return { title: "Projekt" };
  }
  const project = await prisma.project.findFirst({
    where: { id, ...projectAccessWhere(user.id) },
    select: { name: true },
  });
  return { title: project?.name ?? "Projekt" };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

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
          notes: {
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

  const [linkableRows, calendarProjectOptions] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        userId: user.id,
        OR: [{ projectId: null }, { projectId: { not: id } }],
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }, { title: "asc" }],
    }),
    prisma.project.findMany({
      where: {
        ...projectAccessWhere(user.id),
        status: { not: "COMPLETED" },
      },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const mapCal = (e: (typeof linkableRows)[0]) => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString(),
    startTime: e.startTime,
    endTime: e.endTime,
    projectId: e.projectId,
    completed: e.completed,
  });

  const initial: ProjectDetailPayload = {
    id: row.id,
    name: row.name,
    color: row.color,
    description: row.description,
    status: row.status,
    priority: row.priority,
    visibility: row.visibility,
    startDate: row.startDate ? row.startDate.toISOString() : null,
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
      startDate: t.startDate ? t.startDate.toISOString() : null,
      deadline: t.deadline ? t.deadline.toISOString() : null,
      assignee: t.user,
      comments: t.comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
      })),
      notes: t.notes.map((n) => ({
        id: n.id,
        content: n.content,
        createdAt: n.createdAt.toISOString(),
        author: n.author,
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
      url: `/api/files/${f.id}/signed`,
      storagePath: f.storagePath,
      createdAt: f.createdAt.toISOString(),
      uploadedBy: f.uploadedBy,
    })),
    calendarEvents: row.calendarEvents.map(mapCal),
    linkableMeetings: linkableRows.map(mapCal),
    calendarProjectOptions,
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

  return (
    <div className="space-y-4">
      <Link
        href="/projekter"
        className="inline-flex items-center gap-1 font-body text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
        Tilbage til projekter
      </Link>
      <Suspense
        fallback={
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm ring-1 ring-black/5">
            <div className="h-8 w-48 animate-pulse rounded bg-surface-container-high" />
            <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-surface-container-high" />
          </div>
        }
      >
        <ProjectDetailClient
          initial={initial}
          usersForModal={usersForModal}
          currentUserId={user.id}
        />
      </Suspense>
    </div>
  );
}
