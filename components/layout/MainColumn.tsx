"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { TopBar } from "./TopBar";

export function MainColumn({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideDefaultTopBar = pathname === "/projekter";

  return (
    <div className="flex min-h-screen flex-1 flex-col pl-[220px]">
      {hideDefaultTopBar ? null : <TopBar />}
      <main className="min-h-0 flex-1 bg-app-sky px-7 py-6 font-body">{children}</main>
    </div>
  );
}
