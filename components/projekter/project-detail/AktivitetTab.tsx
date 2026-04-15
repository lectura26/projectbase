"use client";

import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Calendar, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { MeetingSidePanel } from "@/components/kalender/MeetingSidePanel";
import { displayName } from "@/lib/projekter/display";
import { initialContentFromNote } from "@/lib/richtext/note-html";
import type { CalendarMeetingDTO } from "@/types/calendar";
import type { ActivityNoteFeedItem } from "@/types/project-detail";

function formatActivityTimestamp(iso: string): string {
  const d = new Date(iso);
  return format(d, "d. MMM yyyy, HH:mm", { locale: da }).replace(/\u00a0/g, " ");
}

function truncTitle(s: string, max = 24): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function meetingToCalendarDto(
  m: NonNullable<ActivityNoteFeedItem["meeting"]>,
): CalendarMeetingDTO {
  return {
    id: m.id,
    title: m.title,
    date: m.date,
    startTime: m.startTime,
    endTime: m.endTime,
    projectId: m.projectId,
    completed: m.completed,
    project: m.project,
  };
}

function ActivityNoteRow({
  note,
  projectId,
  isLast,
  onOpenMeeting,
}: {
  note: ActivityNoteFeedItem;
  projectId: string;
  isLast: boolean;
  onOpenMeeting: (dto: CalendarMeetingDTO) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    if (expanded) {
      setShowToggle(true);
      return;
    }
    const el = contentRef.current;
    if (!el) return;
    setShowToggle(el.scrollHeight > el.clientHeight + 1);
  }, [note.content, expanded]);

  const fromTask = Boolean(note.task);
  const fromMeeting = Boolean(note.meeting);

  return (
    <div className="flex items-stretch gap-0">
      <div className="flex w-10 shrink-0 flex-col items-center">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#1a3167]"
          aria-hidden
        />
        {!isLast ? (
          <div className="w-px flex-1 bg-[#e8e8e8]" aria-hidden />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 pl-4">
        <div className="mb-1.5 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {fromTask && note.task ? (
              <Link
                href={`/projekter/${projectId}?taskId=${note.task.id}`}
                className="inline-flex max-w-full items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-[#1a3167]"
                style={{ backgroundColor: "#f0f6ff" }}
              >
                <ClipboardList className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{truncTitle(note.task.title)}</span>
              </Link>
            ) : null}
            {fromMeeting && note.meeting ? (
              <button
                type="button"
                onClick={() => onOpenMeeting(meetingToCalendarDto(note.meeting!))}
                className="inline-flex max-w-full items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: "#f0f9ff", color: "#0ea5e9" }}
              >
                <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{truncTitle(note.meeting.title)}</span>
              </button>
            ) : null}
          </div>
          <time
            dateTime={note.createdAt}
            className="shrink-0 whitespace-nowrap text-[11px] text-[#9ca3af]"
          >
            {formatActivityTimestamp(note.createdAt)}
          </time>
        </div>
        <p className="text-[12px] font-medium text-[#0f1923]">
          {displayName(note.author)}
        </p>
        <div className="mt-1">
          <div
            ref={contentRef}
            className={`prose-content ${!expanded ? "line-clamp-4" : ""}`}
            dangerouslySetInnerHTML={{
              __html: initialContentFromNote(note.content),
            }}
          />
          {showToggle ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-1 border-0 bg-transparent p-0 text-[12px] text-[#1a3167] hover:underline"
            >
              {expanded ? "Vis mindre" : "Vis mere"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type Props = {
  projectId: string;
  activityNotes: ActivityNoteFeedItem[];
  calendarProjectOptions: { id: string; name: string; color: string }[];
  currentUserId: string;
  onRefresh: () => void;
};

export function AktivitetTab({
  projectId,
  activityNotes,
  calendarProjectOptions,
  currentUserId,
  onRefresh,
}: Props) {
  const router = useRouter();
  const [panelMeetingId, setPanelMeetingId] = useState<string | null>(null);
  const [panelInitial, setPanelInitial] = useState<CalendarMeetingDTO | null>(
    null,
  );

  const openMeetingPanel = (dto: CalendarMeetingDTO) => {
    setPanelInitial(dto);
    setPanelMeetingId(dto.id);
  };

  const closeMeetingPanel = () => {
    setPanelMeetingId(null);
    setPanelInitial(null);
    router.refresh();
    onRefresh();
  };

  return (
    <>
      {activityNotes.length === 0 ? (
        <p className="-m-6 px-6 py-[32px] text-center text-[13px] italic text-[#9ca3af]">
          Ingen aktivitet endnu. Tilføj beskrivelser til opgaver og møder for at
          se dem her.
        </p>
      ) : (
        <div className="-m-6 space-y-5 px-6 py-5">
          {activityNotes.map((note, i) => (
            <ActivityNoteRow
              key={note.id}
              note={note}
              projectId={projectId}
              isLast={i === activityNotes.length - 1}
              onOpenMeeting={openMeetingPanel}
            />
          ))}
        </div>
      )}

      <MeetingSidePanel
        open={panelMeetingId != null}
        meetingId={panelMeetingId}
        initialRow={panelInitial}
        projects={calendarProjectOptions}
        currentUserId={currentUserId}
        onClose={closeMeetingPanel}
        onRefresh={onRefresh}
      />
    </>
  );
}
