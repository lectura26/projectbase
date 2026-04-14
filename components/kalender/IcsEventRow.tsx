"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { linkIcsEventToProject } from "@/app/(dashboard)/kalender/ics-actions";
import type { KalenderIcsEvent, KalenderProject } from "@/types/kalender";

function formatTimeRange(startIso: string, endIso: string | null): string {
  const start = new Date(startIso);
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  const a = start.toLocaleTimeString("da-DK", opts).replace(/\u00a0/g, " ");
  if (!endIso) return a;
  const end = new Date(endIso);
  const b = end.toLocaleTimeString("da-DK", opts).replace(/\u00a0/g, " ");
  return `${a} – ${b}`;
}

type Props = {
  event: KalenderIcsEvent;
  projects: KalenderProject[];
};

export function IcsEventRow({ event, projects }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onSelectProject = useCallback(
    async (projectId: string | null) => {
      setBusy(true);
      try {
        await linkIcsEventToProject(event.id, projectId);
        setOpen(false);
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [event.id, router],
  );

  return (
    <div
      ref={wrapRef}
      className="group relative border-l-[3px] border-[#0ea5e9] pl-3 pr-2 py-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-[#f0f9ff] px-1.5 py-0.5 text-[10px] font-medium text-[#0ea5e9]">
              Outlook
            </span>
            <span className="text-[13px] font-medium text-[#0f1923]">{event.title}</span>
          </div>
          <p className="mt-0.5 text-[13px] tabular-nums text-[#0f1923]">
            {formatTimeRange(event.start, event.end)}
          </p>
          {event.location ? (
            <p className="mt-0.5 text-[12px] text-[#9ca3af]">{event.location}</p>
          ) : null}
        </div>

        <div className="relative flex shrink-0 flex-col items-end gap-1">
          {event.project ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen((o) => !o)}
                className="inline-flex max-w-[200px] items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: event.project.color }}
              >
                {event.project.name}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSelectProject(null)}
                className="rounded p-0.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#dc2626]"
                aria-label="Fjern projekt"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen((o) => !o)}
              className={`text-[12px] text-[#6b7280] underline-offset-2 hover:underline ${
                open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              ＋ Tilknyt projekt
            </button>
          )}

          {open ? (
            <div className="absolute right-0 top-full z-50 mt-1 max-h-48 min-w-[200px] overflow-y-auto rounded-lg border border-[#e8e8e8] bg-white py-1 shadow-lg">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void onSelectProject(p.id)}
                  className="flex w-full items-center px-3 py-2 text-left text-[12px] text-[#0f1923] hover:bg-[#f8f9fa]"
                >
                  {event.projectId === p.id ? (
                    <Check className="mr-2 h-3.5 w-3.5 shrink-0 text-[#16a34a]" aria-hidden />
                  ) : (
                    <span className="mr-5 inline-block w-3.5" aria-hidden />
                  )}
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
