"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { pageTitleFromPath } from "./nav-config";

export function TopBar() {
  const pathname = usePathname();
  const title = pageTitleFromPath(pathname);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 flex h-[52px] shrink-0 items-center justify-between border-b border-app-topbar-border bg-white px-7"
      role="banner"
    >
      <h1 className="font-body text-[15px] font-medium text-app-sidebar">{title}</h1>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-app-sidebar transition-colors hover:bg-secondary-container/40"
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="Notifikationer"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>
        {open ? (
          <div
            className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-outline-variant/15 bg-surface-container-lowest py-3 shadow-[0_8px_32px_rgba(26,49,103,0.06)]"
            role="menu"
          >
            <p className="px-4 py-6 text-center font-body text-sm text-on-surface-variant/80">
              Ingen notifikationer endnu.
            </p>
          </div>
        ) : null}
      </div>
    </header>
  );
}
