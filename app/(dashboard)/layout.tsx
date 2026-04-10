import type { NotificationType } from "@prisma/client";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppToaster } from "@/components/Toaster";
import { AppShell } from "@/components/layout/AppShell";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { createClient } from "@/lib/supabase/server";
import {
  getNotificationsForUser,
  syncOverdueTaskNotifications,
} from "@/lib/notifications/service";
import { prisma } from "@/lib/prisma";
import type { NotificationDTO } from "@/types/notifications";

type AppNotification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  relatedProjectId: string | null;
  relatedTaskId: string | null;
  createdAt: Date;
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let userLabel = "";
  let initialNotifications: NotificationDTO[] = [];

  if (user.email) {
    await ensureAppUser(user);
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    });
    userLabel = row?.name ?? row?.email ?? user.email;

    await syncOverdueTaskNotifications(user.id);
    const notifRows = await getNotificationsForUser(user.id);
    initialNotifications = notifRows.map((n: AppNotification) => ({
      id: n.id,
      type: n.type as NotificationType,
      message: n.message,
      read: n.read,
      relatedProjectId: n.relatedProjectId,
      relatedTaskId: n.relatedTaskId,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  return (
    <AppShell
      userLabel={userLabel}
      initialNotifications={initialNotifications}
    >
      <AppToaster />
      {children}
    </AppShell>
  );
}
