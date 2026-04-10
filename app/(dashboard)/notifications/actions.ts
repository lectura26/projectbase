"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session-user";

export async function markNotificationRead(notificationId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Ikke logget ind.");

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { read: true },
  });

  revalidatePath("/", "layout");
}
