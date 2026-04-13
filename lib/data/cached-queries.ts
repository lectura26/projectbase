import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { copenhagenDayRangeUTC } from "@/lib/datetime/copenhagen-range";
import { projectAccessWhere } from "@/lib/projekter/project-access";

/** Dedupes identical user lookups within the same RSC request (layout + pages). */
export const getCachedUserBasic = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
});

/** Single round-trip for Projekter list: profile + owned projects with relations. */
export const getCachedProjekterPageBundle = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      ownedProjects: {
        where: { isTemplate: false },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          contacts: { select: { id: true, name: true } },
          tasks: { select: { status: true } },
        },
      },
    },
  });
});

/** Oversigt dashboard: shared user row + parallel domain queries (cached per request). */
export const getCachedOversigtDashboardData = cache(async (userId: string) => {
  const row = await getCachedUserBasic(userId);
  if (!row) return null;

  const now = new Date();
  const { start: dayStart, end: dayEnd } = copenhagenDayRangeUTC(now);

  const [todayTasks, pulseRaw, deadlineTasks, meetingRows] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        status: { not: "DONE" },
        deadline: { gte: dayStart, lte: dayEnd },
        project: projectAccessWhere(userId),
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: [{ deadline: "asc" }, { title: "asc" }],
    }),
    prisma.project.findMany({
      where: projectAccessWhere(userId),
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        tasks: { select: { status: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: { not: "DONE" },
        deadline: { gte: now },
        project: projectAccessWhere(userId),
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: [{ deadline: "asc" }, { title: "asc" }],
      take: 5,
    }),
    prisma.calendarEvent.findMany({
      where: {
        date: { gte: dayStart },
        project: projectAccessWhere(userId),
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: [{ date: "asc" }, { title: "asc" }],
      take: 5,
    }),
  ]);

  return {
    user: row,
    now,
    todayTasks,
    pulseRaw,
    deadlineTasks,
    meetingRows,
  };
});
