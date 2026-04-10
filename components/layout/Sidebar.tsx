"use client";

import Image from "next/image";
import Link from "next/link";
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
      className="fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col border-r border-slate-200 bg-white p-4 font-body text-sm antialiased tracking-tight"
      aria-label="Hovednavigation"
    >
      <div className="mb-8 flex items-center gap-2 px-1">
        <Image
          src="/projectbase_logo_dark.svg"
          alt="Projectbase"
          width={148}
          height={36}
          priority
          className="h-8 w-auto"
        />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeId === item.id;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-md px-4 py-2 transition-colors",
                isActive
                  ? "bg-slate-100 font-medium text-primary-container"
                  : "text-slate-500 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-[20px] leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-100 pt-4">
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
          className="flex w-full items-center gap-3 rounded-md px-4 py-2 text-left text-slate-500 transition-colors hover:bg-slate-50"
        >
          <span className="material-symbols-outlined text-[20px] leading-none">logout</span>
          Log ud
        </button>
      </div>
    </aside>
  );
}
