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

const projekterListInclude = {
  user: { select: { id: true, name: true, email: true } },
  contacts: { select: { id: true, name: true } },
  tasks: { select: { status: true } },
} as const;

/** Profile + owned active projects + owned completed projects (separate lists). */
export const getCachedProjekterPageBundle = cache(async (userId: string) => {
  const [row, activeOwnedProjects, completedOwnedProjects] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    }),
    prisma.project.findMany({
      where: {
        userId,
        isTemplate: false,
        status: { not: "COMPLETED" },
      },
      orderBy: { createdAt: "desc" },
      include: projekterListInclude,
    }),
    prisma.project.findMany({
      where: {
        userId,
        isTemplate: false,
        status: "COMPLETED",
      },
      orderBy: { createdAt: "desc" },
      include: projekterListInclude,
    }),
  ]);

  if (!row) return null;

  return {
    ...row,
    activeOwnedProjects,
    completedOwnedProjects,
  };
});

/** Oversigt dashboard: shared user row + parallel domain queries (cached per request). */
export const getCachedOversigtDashboardData = cache(async (userId: string) => {
  const row = await getCachedUserBasic(userId);
  if (!row) return null;

  const now = new Date();
  const { start: dayStart } = copenhagenDayRangeUTC(now);

  const [upcomingTasks, pulseRaw, deadlineTasks, meetingRows] = await Promise.all([
    prisma.task.findMany({
      where: {
        project: { userId, isTemplate: false },
        status: { not: "DONE" },
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { title: "asc" }],
      take: 10,
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
    upcomingTasks,
    pulseRaw,
    deadlineTasks,
    meetingRows,
  };
});
