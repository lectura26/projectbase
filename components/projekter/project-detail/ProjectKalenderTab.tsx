"use client";

import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Link2, Pencil, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MeetingModal } from "@/components/calendar/MeetingModal";
import { MeetingSidePanel } from "@/components/kalender/MeetingSidePanel";
import {
  linkMeetingToProject,
  unlinkMeetingFromProject,
} from "@/lib/calendar/actions";
import type { CalendarMeetingDTO } from "@/types/calendar";
import type { CalendarEventDTO, ProjectDetailPayload } from "@/types/project-detail";

function formatMeetingWhen(e: CalendarEventDTO): string {
  const d = new Date(e.date);
  const dateStr = format(d, "d. MMM yyyy", { locale: da });
  const t = e.startTime?.trim();
  const en = e.endTime?.trim();
  if (t && en) return `${dateStr} · ${t}–${en}`;
  if (t) return `${dateStr} · ${t}`;
  return dateStr;
}

function toMeetingDto(
  e: CalendarEventDTO,
  projects: ProjectDetailPayload["calendarProjectOptions"],
): CalendarMeetingDTO {
  const proj = e.projectId
    ? projects.find((p) => p.id === e.projectId)
    : null;
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    projectId: e.projectId,
    completed: e.completed,
    project: proj
      ? { id: proj.id, name: proj.name, color: proj.color }
      : null,
  };
}

type Props = {
  initial: ProjectDetailPayload;
  onRefresh: () => void;
  currentUserId: string;
};

export function ProjectKalenderTab({
  initial,
  onRefresh,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [panelMeetingId, setPanelMeetingId] = useState<string | null>(null);
  const [panelInitial, setPanelInitial] = useState<CalendarMeetingDTO | null>(
    null,
  );

  const projectMeetings = initial.calendarEvents;

  const filteredLinkable = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = initial.linkableMeetings;
    if (!q) return rows;
    return rows.filter((m) => m.title.toLowerCase().includes(q));
  }, [initial.linkableMeetings, search]);

  const openCreate = () => {
    setCreateModalOpen(true);
  };

  const openMeetingPanel = (e: CalendarEventDTO) => {
    setPanelInitial(toMeetingDto(e, initial.calendarProjectOptions));
    setPanelMeetingId(e.id);
  };

  const closeMeetingPanel = () => {
    setPanelMeetingId(null);
    setPanelInitial(null);
    router.refresh();
    onRefresh();
  };

  const onUnlink = async (meetingId: string) => {
    try {
      await unlinkMeetingFromProject(meetingId);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const onLink = async (meetingId: string) => {
    try {
      await linkMeetingToProject(meetingId, initial.id);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  return (
    <div className="space-y-10">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-[#0f1923]">
          Møder under dette projekt
        </h3>
        {projectMeetings.length === 0 ? (
          <p className="text-sm text-[#6b7280]">
            Ingen møder tilknyttet dette projekt endnu.{" "}
            <button
              type="button"
              onClick={openCreate}
              className="font-medium text-[#1a3167] underline"
            >
              + Tilføj møde
            </button>
          </p>
        ) : (
          <ul className="space-y-2">
            {projectMeetings.map((e) => (
              <li
                key={e.id}
                className="group flex items-start gap-3 border-l-[3px] pl-3"
                style={{ borderColor: initial.calendarColor }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-[#6b7280]">{formatMeetingWhen(e)}</p>
                  <p className="text-[13px] font-medium text-[#0f1923]">{e.title}</p>
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => openMeetingPanel(e)}
                    className="rounded p-1 text-[#6b7280] hover:bg-[#f3f4f6]"
                    aria-label="Rediger"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void onUnlink(e.id)}
                    className="rounded p-1 text-[#6b7280] hover:bg-[#f3f4f6]"
                    aria-label="Fjern projekt"
                  >
                    <Unlink className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {projectMeetings.length > 0 ? (
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 text-sm font-medium text-[#1a3167] hover:underline"
          >
            + Tilføj møde
          </button>
        ) : null}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-[#0f1923]">
          Tilknyt eksisterende møde
        </h3>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Søg efter møde..."
          className="mb-3 w-full max-w-md rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm"
        />
        <ul className="divide-y divide-[#f3f4f6] rounded-lg border border-[#e8e8e8]">
          {filteredLinkable.length === 0 ? (
            <li className="px-3 py-4 text-sm text-[#9ca3af]">Ingen møder matcher.</li>
          ) : (
            filteredLinkable.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-3"
              >
                <div>
                  <p className="text-[13px] font-medium text-[#0f1923]">{m.title}</p>
                  <p className="text-[12px] text-[#6b7280]">{formatMeetingWhen(m)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void onLink(m.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#e8e8e8] px-3 py-1.5 text-sm font-medium text-[#1a3167] hover:bg-[#f0f6ff]"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Tilknyt
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <MeetingModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        mode="create"
        initial={null}
        defaultProjectId={initial.id}
        projects={initial.calendarProjectOptions}
        onSaved={() => {
          setCreateModalOpen(false);
          router.refresh();
          onRefresh();
        }}
      />

      <MeetingSidePanel
        open={panelMeetingId != null}
        meetingId={panelMeetingId}
        initialRow={panelInitial}
        projects={initial.calendarProjectOptions}
        currentUserId={currentUserId}
        onClose={closeMeetingPanel}
        onRefresh={() => {
          router.refresh();
          onRefresh();
        }}
      />
    </div>
  );
}
