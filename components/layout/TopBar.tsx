"use client";

import type { NotificationType } from "@prisma/client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { markNotificationRead } from "@/app/(dashboard)/notifications/actions";
import type { NotificationDTO } from "@/types/notifications";
import { pageTitleFromPath } from "./nav-config";

function actionLabel(type: NotificationType): string {
  switch (type) {
    case "OVERDUE_TASK":
      return "Åbn projekt";
    case "AI_MATCH":
      return "Gennemse";
    case "TASK_ASSIGNED":
      return "Åbn opgave";
    case "ROUTINE_RESTARTED":
      return "Åbn projekt";
    default:
      return "Åbn";
  }
}

function notificationHref(n: NotificationDTO): string | null {
  if (!n.relatedProjectId) return null;
  return `/projekter/${n.relatedProjectId}`;
}

export function TopBar({
  initialNotifications,
}: {
  initialNotifications: NotificationDTO[];
}) {
  const pathname = usePathname();
  const router = useRouter();
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

  const unread = initialNotifications.filter((n) => !n.read).length;

  async function onOpenNotification(n: NotificationDTO) {
    const href = notificationHref(n);
    if (!href) return;
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    router.push(href);
    router.refresh();
  }

  async function onActionClick(e: React.MouseEvent, n: NotificationDTO) {
    e.stopPropagation();
    await onOpenNotification(n);
  }

  return (
    <header
      className="sticky top-0 z-40 flex h-12 w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white/85 px-6 font-body text-sm font-medium backdrop-blur-md"
      role="banner"
    >
      <h1 className="text-base font-extrabold tracking-tight text-primary-container">{title}</h1>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-primary-container"
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="Notifikationer"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          {unread > 0 ? (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
        {open ? (
          <div
            className="absolute right-0 top-full z-50 mt-1 max-h-[min(70vh,420px)] w-80 overflow-y-auto rounded-xl border border-outline-variant/20 bg-white/90 py-2 shadow-[0_8px_24px_rgba(15,25,35,0.06)] backdrop-blur-[20px]"
            role="menu"
          >
            {initialNotifications.length === 0 ? (
              <p className="px-4 py-6 text-center font-body text-sm text-on-surface-variant/80">
                Ingen notifikationer endnu.
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant/10">
                {initialNotifications.map((n) => {
                  const href = notificationHref(n);
                  return (
                    <li key={n.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && href) void onOpenNotification(n);
                        }}
                        onClick={() => {
                          if (href) void onOpenNotification(n);
                        }}
                        className={`cursor-pointer px-4 py-3 text-left transition-colors hover:bg-surface-container-low ${
                          n.read ? "opacity-80" : "bg-surface-container-low/80"
                        }`}
                      >
                        <p className="font-body text-[13px] leading-snug text-on-surface">
                          {n.message}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-on-surface-variant">
                            {new Date(n.createdAt).toLocaleString("da-DK", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {href ? (
                            <button
                              type="button"
                              onClick={(e) => onActionClick(e, n)}
                              className="rounded-md bg-primary px-2.5 py-1 font-body text-[11px] font-medium text-on-primary hover:opacity-90"
                            >
                              {actionLabel(n.type)}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="border-t border-outline-variant/10 px-4 py-2 text-center text-[10px] text-on-surface-variant/70">
              Notifikationer udløber efter 7 dage.
            </p>
          </div>
        ) : null}
      </div>
    </header>
  );
}
