import type { ReactNode } from "react";
import { MainColumn } from "./MainColumn";
import { Sidebar } from "./Sidebar";

export function AppShell({
  children,
  userLabel,
}: {
  children: ReactNode;
  userLabel: string;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar userLabel={userLabel} />
      <MainColumn>{children}</MainColumn>
    </div>
  );
}
