import type { User } from "@supabase/supabase-js";
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
import { getCachedUserBasic } from "@/lib/data/cached-queries";
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
  let user: User | null = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Session may still be establishing after OAuth — try getSession below.
  }

  if (!user?.id) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    user = session?.user ?? null;
  }

  if (!user?.id) {
    redirect("/login");
  }

  let userLabel = "";
  let initialNotifications: NotificationDTO[] = [];

  if (user.email) {
    await ensureAppUser(user);
    const row = await getCachedUserBasic(user.id);
    userLabel = row?.name ?? row?.email ?? user.email;

    await syncOverdueTaskNotifications(user.id);
    const notifRows = await getNotificationsForUser(user.id);
    initialNotifications = notifRows.map((n: AppNotification) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      read: n.read,
      relatedProjectId: n.relatedProjectId,
      relatedTaskId: n.relatedTaskId,
      createdAt: n.createdAt.toISOString(),
    })) as NotificationDTO[];
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
