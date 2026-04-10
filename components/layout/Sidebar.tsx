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
      className="fixed left-0 top-0 z-50 flex min-h-screen w-[220px] flex-col overflow-y-auto bg-app-sidebar text-white"
      aria-label="Hovednavigation"
    >
      <div className="flex min-h-0 flex-1 flex-col px-5 pt-8">
        <div className="mb-10 px-3">
          <Image
            src="/projectbase_logo_dark.svg"
            alt="Projectbase"
            width={160}
            height={40}
            priority
          />
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] transition-colors",
                  isActive
                    ? "bg-[rgba(204,232,244,0.12)] text-app-sky"
                    : "text-white/[0.65] hover:bg-[rgba(255,255,255,0.05)]",
                ].join(" ")}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 px-5 py-6">
        {userLabel ? (
          <p className="truncate px-3 text-[12px] text-white/[0.65]" title={userLabel}>
            {userLabel}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13px] text-white/[0.65] transition-colors hover:bg-[rgba(255,255,255,0.05)]"
        >
          Log ud
        </button>
      </div>
    </aside>
  );
}
