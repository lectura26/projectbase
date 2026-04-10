import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { projectAccessWhere } from "@/lib/projekter/project-access";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  message: string;
  relatedProjectId?: string | null;
  relatedTaskId?: string | null;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      relatedProjectId: input.relatedProjectId ?? null,
      relatedTaskId: input.relatedTaskId ?? null,
    },
  });
}

/** Remove notifications older than 7 days for this user (auto-dismiss). */
export async function purgeExpiredNotifications(userId: string) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.notification.deleteMany({
    where: { userId, createdAt: { lt: cutoff } },
  });
}

export async function syncOverdueTaskNotifications(userId: string) {
  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      status: { not: "DONE" },
      deadline: { lt: now },
      project: projectAccessWhere(userId),
      OR: [{ userId }, { userId: null, project: { userId } }],
    },
    include: { project: { select: { name: true, userId: true } } },
  });

  for (const t of tasks) {
    const recipientId = t.userId ?? t.project.userId;
    if (recipientId !== userId) continue;

    const exists = await prisma.notification.findFirst({
      where: {
        userId,
        type: "OVERDUE_TASK",
        relatedTaskId: t.id,
        createdAt: { gte: weekAgo },
      },
    });
    if (exists) continue;

    await createNotification({
      userId,
      type: "OVERDUE_TASK",
      message: `Opgave overskredet: ${t.title} på ${t.project.name}`,
      relatedProjectId: t.projectId,
      relatedTaskId: t.id,
    });
  }
}

export async function getNotificationsForUser(userId: string) {
  await purgeExpiredNotifications(userId);
  const minDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return prisma.notification.findMany({
    where: { userId, createdAt: { gte: minDate } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

/** Call when an activity is auto-matched to a project (e.g. Microsoft integration). */
export async function notifyAiMatchForProject(
  projectId: string,
  projectName: string,
  recipientIds: string[],
) {
  const msg = `Ny aktivitet matchet til ${projectName} — godkend?`;
  for (const userId of recipientIds) {
    await createNotification({
      userId,
      type: "AI_MATCH",
      message: msg,
      relatedProjectId: projectId,
    });
  }
}
