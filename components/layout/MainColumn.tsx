"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { NotificationDTO } from "@/types/notifications";
import { TopBar } from "./TopBar";

export function MainColumn({
  children,
  initialNotifications,
}: {
  children: ReactNode;
  initialNotifications: NotificationDTO[];
}) {
  const pathname = usePathname();
  const hideDefaultTopBar = pathname === "/projekter";

  return (
    <div className="flex min-h-screen min-w-0 flex-1 flex-col pl-[220px]">
      {hideDefaultTopBar ? null : (
        <TopBar initialNotifications={initialNotifications} />
      )}
      <main className="min-h-0 flex-1 bg-surface px-8 pb-8 pt-[24px] font-body">{children}</main>
    </div>
  );
}
