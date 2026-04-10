import type { ReactNode } from "react";
import type { NotificationDTO } from "@/types/notifications";
import { MainColumn } from "./MainColumn";
import { Sidebar } from "./Sidebar";

export function AppShell({
  children,
  userLabel,
  initialNotifications,
}: {
  children: ReactNode;
  userLabel: string;
  initialNotifications: NotificationDTO[];
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar userLabel={userLabel} />
      <MainColumn initialNotifications={initialNotifications}>
        {children}
      </MainColumn>
    </div>
  );
}
