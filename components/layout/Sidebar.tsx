"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NAV_ITEMS, navIdFromPath } from "./nav-config";

export function Sidebar({ userLabel }: { userLabel: string }) {
  const pathname = usePathname();
  const activeId = navIdFromPath(pathname);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside
      className="fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col border-r border-slate-200 bg-white font-body text-sm antialiased tracking-tight"
      aria-label="Hovednavigation"
    >
      <div className="flex items-center gap-2 p-[20px]">
        <Link
          href="/oversigt"
          className="inline-block cursor-pointer"
          aria-label="Gå til oversigt"
        >
          <Logo className="h-8 w-auto" />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-2 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex min-h-[36px] items-center gap-3 rounded-md px-4 py-3 transition-colors",
                isActive
                  ? "bg-slate-100 font-medium text-primary-container"
                  : "text-slate-500 hover:bg-slate-50",
              ].join(" ")}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-100 px-3 pb-4 pt-4">
        {userLabel ? (
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-surface-container-low px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-[10px] font-bold text-on-primary">
              {userLabel
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join("") || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-on-surface">{userLabel}</p>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md py-3 pl-7 pr-4 text-left text-slate-500 transition-colors hover:bg-slate-50"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden />
          Log ud
        </button>
      </div>
    </aside>
  );
}
