"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import { parseOrThrow } from "@/lib/validation/parse";
import { cuidLikeSchema } from "@/lib/validation/schemas";

function parseIsoDateOnly(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) throw new Error("Ugyldig dato.");
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d, 12, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    throw new Error("Ugyldig dato.");
  }
  return dt;
}

function normTime(t: string | undefined | null): string | null {
  if (t == null || t === "") return null;
  const s = t.trim();
  if (!s) return null;
  return s;
}

async function assertMeetingOwner(meetingId: string, userId: string) {
  const row = await prisma.calendarEvent.findFirst({
    where: { id: meetingId, userId },
    select: { id: true },
  });
  if (!row) throw new Error("Møde ikke fundet.");
}

export async function createMeeting(data: {
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  projectId?: string | null;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const title = data.title.trim();
  if (!title) throw new Error("Titel er påkrævet.");

  const d = parseIsoDateOnly(data.date);
  let projectId: string | null = null;
  if (data.projectId) {
    const pid = parseOrThrow(cuidLikeSchema, data.projectId);
    const p = await prisma.project.findFirst({
      where: { id: pid, ...projectAccessWhere(user.id) },
      select: { id: true },
    });
    if (!p) throw new Error("Projekt ikke fundet.");
    projectId = pid;
  }

  await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      title,
      date: d,
      startTime: normTime(data.startTime),
      endTime: normTime(data.endTime),
      projectId,
    },
  });

  revalidatePath("/kalender");
  revalidatePath("/oversigt");
  if (projectId) revalidatePath(`/projekter/${projectId}`);
}

export async function updateMeeting(
  id: string,
  data: {
    title?: string;
    date?: string;
    startTime?: string | null;
    endTime?: string | null;
    projectId?: string | null;
  },
) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const mid = parseOrThrow(cuidLikeSchema, id);
  await assertMeetingOwner(mid, user.id);

  const prev = await prisma.calendarEvent.findUnique({
    where: { id: mid },
    select: { projectId: true },
  });

  const patch: {
    title?: string;
    date?: Date;
    startTime?: string | null;
    endTime?: string | null;
    projectId?: string | null;
  } = {};

  if (data.title !== undefined) {
    const t = data.title.trim();
    if (!t) throw new Error("Titel er påkrævet.");
    patch.title = t;
  }
  if (data.date !== undefined) {
    patch.date = parseIsoDateOnly(data.date);
  }
  if (data.startTime !== undefined) patch.startTime = normTime(data.startTime);
  if (data.endTime !== undefined) patch.endTime = normTime(data.endTime);
  if (data.projectId !== undefined) {
    if (data.projectId === null) {
      patch.projectId = null;
    } else {
      const pid = parseOrThrow(cuidLikeSchema, data.projectId);
      const p = await prisma.project.findFirst({
        where: { id: pid, ...projectAccessWhere(user.id) },
        select: { id: true },
      });
      if (!p) throw new Error("Projekt ikke fundet.");
      patch.projectId = pid;
    }
  }

  await prisma.calendarEvent.update({
    where: { id: mid },
    data: patch,
  });

  revalidatePath("/kalender");
  revalidatePath("/oversigt");
  if (prev?.projectId) revalidatePath(`/projekter/${prev.projectId}`);
  if (patch.projectId !== undefined && patch.projectId !== prev?.projectId) {
    if (patch.projectId) revalidatePath(`/projekter/${patch.projectId}`);
  }
}

export async function deleteMeeting(id: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const mid = parseOrThrow(cuidLikeSchema, id);
  await assertMeetingOwner(mid, user.id);

  const row = await prisma.calendarEvent.findUnique({
    where: { id: mid },
    select: { projectId: true },
  });
  if (!row) throw new Error("Møde ikke fundet.");

  await prisma.calendarEvent.delete({ where: { id: mid } });

  revalidatePath("/kalender");
  revalidatePath("/oversigt");
  if (row.projectId) revalidatePath(`/projekter/${row.projectId}`);
}

export async function linkMeetingToProject(
  meetingId: string,
  projectId: string,
) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const mid = parseOrThrow(cuidLikeSchema, meetingId);
  const pid = parseOrThrow(cuidLikeSchema, projectId);

  await assertMeetingOwner(mid, user.id);

  const p = await prisma.project.findFirst({
    where: { id: pid, ...projectAccessWhere(user.id) },
    select: { id: true },
  });
  if (!p) throw new Error("Projekt ikke fundet.");

  const prev = await prisma.calendarEvent.findUnique({
    where: { id: mid },
    select: { projectId: true },
  });

  await prisma.calendarEvent.update({
    where: { id: mid },
    data: { projectId: pid },
  });

  revalidatePath("/kalender");
  revalidatePath("/oversigt");
  revalidatePath(`/projekter/${pid}`);
  if (prev?.projectId && prev.projectId !== pid) {
    revalidatePath(`/projekter/${prev.projectId}`);
  }
}

export async function unlinkMeetingFromProject(meetingId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const mid = parseOrThrow(cuidLikeSchema, meetingId);
  await assertMeetingOwner(mid, user.id);

  const row = await prisma.calendarEvent.findUnique({
    where: { id: mid },
    select: { projectId: true },
  });
  if (!row?.projectId) return;

  await prisma.calendarEvent.update({
    where: { id: mid },
    data: { projectId: null },
  });

  revalidatePath("/kalender");
  revalidatePath("/oversigt");
  revalidatePath(`/projekter/${row.projectId}`);
}

export async function getMeetingsForUser(userId: string) {
  return prisma.calendarEvent.findMany({
    where: { userId },
    include: {
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}
