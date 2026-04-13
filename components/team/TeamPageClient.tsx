"use client";

import type { AppRole } from "@prisma/client";
import { X } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { getTeamMemberDetail } from "@/app/(dashboard)/team/actions";
import type { TeamListRow } from "@/app/(dashboard)/team/page";
import { displayName, initialsFromUser } from "@/lib/projekter/display";
import { formatDanishDate } from "@/lib/datetime/format-danish";

type PanelData = Awaited<ReturnType<typeof getTeamMemberDetail>>;

function roleLabel(role: AppRole) {
  return role === "ADMIN" ? "Admin" : "Medlem";
}

function UserAvatar({
  name,
  email,
  imageUrl,
  size = "sm",
}: {
  name: string;
  email: string;
  imageUrl: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-12 w-12 text-sm" : "h-8 w-8 text-xs";
  if (imageUrl) {
    const wh = size === "md" ? 48 : 32;
    return (
      <Image
        src={imageUrl}
        alt=""
        width={wh}
        height={wh}
        unoptimized
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-primary-container font-bold text-white`}
    >
      {initialsFromUser({ name, email })}
    </span>
  );
}

type Props = {
  rows: TeamListRow[];
};

export default function TeamPageClient({ rows }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelData | null>(null);
  const [pending, startTransition] = useTransition();
  const detailRequestId = useRef(0);

  const selectedRow = selectedId
    ? rows.find((r) => r.id === selectedId)
    : undefined;

  function openRow(id: string) {
    setSelectedId(id);
    setPanel(null);
    const req = ++detailRequestId.current;
    startTransition(async () => {
      try {
        const data = await getTeamMemberDetail(id);
        if (detailRequestId.current !== req) return;
        setPanel(data);
      } catch {
        if (detailRequestId.current !== req) return;
        setPanel(null);
        setSelectedId(null);
      }
    });
  }

  function closePanel() {
    setSelectedId(null);
    setPanel(null);
  }

  return (
    <div className="relative flex gap-0">
      <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-outline-variant/10">
          {rows.length === 0 ? (
            <li className="px-4 py-8 text-sm text-on-surface-variant/90">Ingen teammedlemmer endnu.</li>
          ) : null}
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => openRow(row.id)}
                className={`flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-surface-container-low ${
                  selectedId === row.id ? "bg-slate-100" : ""
                }`}
              >
                <UserAvatar
                  name={row.name}
                  email={row.email}
                  imageUrl={row.image}
                />
                <span className="min-w-0 flex-1 font-body text-sm font-medium text-on-surface">
                  {row.name}
                </span>
                <span
                  className="shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-surface-container-high text-on-surface-variant"
                >
                  {roleLabel(row.appRole)}
                </span>
                <span className="hidden w-24 shrink-0 text-right text-xs text-on-surface-variant sm:block">
                  {row.activeProjectCount} aktive projekter
                </span>
                <span className="hidden w-24 shrink-0 text-right text-xs text-on-surface-variant md:block">
                  {row.openTaskCount} åbne opgaver
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedId && selectedRow ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[150] bg-primary/10 sm:hidden"
            aria-label="Luk panel"
            onClick={closePanel}
          />
          <aside className="fixed right-0 top-0 z-[160] flex h-full w-full max-w-[320px] flex-col border-l border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,25,35,0.06)] sm:sticky sm:top-16 sm:h-[calc(100vh-4rem)] sm:shrink-0">
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant/10 px-4 py-4">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={panel?.member.name ?? selectedRow.name}
                  email={panel?.member.email ?? selectedRow.email}
                  imageUrl={
                    panel?.member.image ?? selectedRow.image
                  }
                  size="md"
                />
                <div>
                  <p className="font-headline text-base font-semibold text-primary">
                    {panel
                      ? displayName(panel.member)
                      : selectedRow.name}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {roleLabel(panel?.member.appRole ?? selectedRow.appRole)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="shrink-0 rounded-full p-1 text-on-surface-variant hover:bg-surface-container-low"
                aria-label="Luk"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {pending || !panel ? (
                <p className="text-sm text-on-surface-variant">Henter…</p>
              ) : (
                <>
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Åbne opgaver
                    </h3>
                    {panel.taskGroups.length === 0 ? (
                      <p className="mt-2 text-sm text-on-surface-variant">
                        Ingen åbne opgaver.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-4">
                        {panel.taskGroups.map((g) => (
                          <li key={g.id}>
                            <p className="text-xs font-semibold text-primary">
                              {g.name}
                            </p>
                            <ul className="mt-1 space-y-1">
                              {g.tasks.map((t) => (
                                <li
                                  key={t.id}
                                  className="text-xs text-on-surface"
                                >
                                  • {t.title}
                                  {t.deadline
                                    ? ` — ${formatDanishDate(t.deadline)}`
                                    : ""}
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section className="mt-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Kalender (7 dage)
                    </h3>
                    {panel.events.length === 0 ? (
                      <p className="mt-2 text-sm text-on-surface-variant">
                        Ingen begivenheder.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {panel.events.map((e) => (
                          <li key={e.id} className="text-xs">
                            <span className="font-medium text-on-surface">
                              {e.title}
                            </span>
                            <span className="text-on-surface-variant">
                              {" "}
                              — {e.projectName}
                              <br />
                              {formatDanishDate(e.date)}
                              {e.eventTime ? ` · ${e.eventTime}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
