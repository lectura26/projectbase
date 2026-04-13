"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session-user";
import { rateLimitAllow } from "@/lib/rate-limit";
import { parseOrThrow } from "@/lib/validation/parse";
import { notificationIdSchema } from "@/lib/validation/schemas";

const READ_WINDOW_MS = 60_000;
const READ_MAX = 120;

export async function markNotificationRead(notificationId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  const id = parseOrThrow(notificationIdSchema, notificationId);

  if (!rateLimitAllow(`notif-read:${user.id}`, READ_MAX, READ_WINDOW_MS)) {
    throw new Error("For mange anmodninger. Prøv igen om lidt.");
  }

  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });

  revalidatePath("/", "layout");
}
