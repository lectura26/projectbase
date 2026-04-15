"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  createMeetingComment,
  createMeetingNote,
  getMeetingWithDetails,
  linkMeetingToProject,
  toggleMeetingCompleted,
  unlinkMeetingFromProject,
  updateMeetingField,
} from "@/lib/calendar/actions";
import { displayName, initialsFromUser } from "@/lib/projekter/display";
import { isoToYmd, ymdToIsoDate } from "@/lib/datetime/ymd";
import type {
  CalendarMeetingDTO,
  CalendarProjectOption,
  MeetingDetailDTO,
} from "@/types/calendar";
import { DatePicker } from "@/components/ui/DatePicker";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { TodoSection } from "@/components/projekter/project-detail/TodoSection";
import {
  initialContentFromNote,
  normalizeNoteForCompare,
  notesAreEqual,
} from "@/lib/richtext/note-html";

function formatNoteDetailTimestamp(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(d)
    .replace(/\u00a0/g, " ");
}

function meetingViewedStorageKey(meetingId: string) {
  return `meeting_viewed_${meetingId}`;
}

function timeToInput(v: string | null | undefined): string {
  if (!v?.trim()) return "";
  const t = v.trim();
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  return t.slice(0, 5);
}

const fieldCellClass =
  "flex min-h-0 min-w-0 cursor-pointer flex-col rounded-[6px] bg-[#f8f9fa] px-3 py-2 transition-colors hover:bg-[#f0f6ff]";
const fieldLabelClass =
  "mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-[#9ca3af]";

type Props = {
  open: boolean;
  meetingId: string | null;
  initialRow: CalendarMeetingDTO | null;
  projects: CalendarProjectOption[];
  currentUserId: string;
  onClose: () => void;
  onRefresh: () => void;
};

export function MeetingSidePanel({
  open,
  meetingId,
  initialRow,
  projects,
  currentUserId,
  onClose,
  onRefresh,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [detail, setDetail] = useState<MeetingDetailDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState("");
  const [dateYmd, setDateYmd] = useState("");
  const [startDraft, setStartDraft] = useState("");
  const [endDraft, setEndDraft] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectOpen, setProjectOpen] = useState(false);

  const [noteDraft, setNoteDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [viewTick, setViewTick] = useState(0);
  const [noteError, setNoteError] = useState("");
  const [showChangeLog, setShowChangeLog] = useState(false);

  useEffect(() => {
    if (!open || !meetingId) {
      setDetail(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoadError(null);
    if (initialRow) {
      setTitleDraft(initialRow.title);
      setDateYmd(isoToYmd(initialRow.date));
      setStartDraft(timeToInput(initialRow.startTime));
      setEndDraft(timeToInput(initialRow.endTime));
    }
    void getMeetingWithDetails(meetingId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setTitleDraft(d.title);
        setDateYmd(isoToYmd(d.date));
        setStartDraft(timeToInput(d.startTime));
        setEndDraft(timeToInput(d.endTime));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg =
          e instanceof Error ? e.message : "Kunne ikke indlæse møde.";
        setLoadError(msg);
        toast.error(msg);
      });
    return () => {
      cancelled = true;
    };
  }, [open, meetingId, initialRow?.id]);

  const latestNoteContent = useMemo(() => {
    const n = detail?.notes ?? [];
    if (!n.length) return "";
    const sorted = [...n].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return sorted[sorted.length - 1].content;
  }, [detail?.notes]);

  useEffect(() => {
    if (!detail) return;
    setNoteDraft(latestNoteContent);
    setNoteError("");
  }, [detail?.id, latestNoteContent]);

  useEffect(() => {
    if (open && meetingId && typeof window !== "undefined") {
      const key = meetingViewedStorageKey(meetingId);
      localStorage.setItem(key, String(Date.now()));
      setViewTick((t) => t + 1);
    }
  }, [open, meetingId]);

  useEffect(() => {
    if (!open) {
      setCommentDraft("");
      setCommentsOpen(false);
      setShowChangeLog(false);
      setProjectOpen(false);
    }
  }, [open]);

  const lastViewedMs = useMemo(() => {
    if (typeof window === "undefined" || !meetingId) return null;
    const raw = localStorage.getItem(meetingViewedStorageKey(meetingId));
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }, [meetingId, detail?.comments, open, viewTick]);

  const commentUnread = useMemo(() => {
    const comments = detail?.comments ?? [];
    if (!comments.length) return false;
    const latest = Math.max(
      ...comments.map((c) => new Date(c.createdAt).getTime()),
    );
    if (lastViewedMs == null) return true;
    return latest > lastViewedMs;
  }, [detail?.comments, lastViewedMs]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, projectSearch]);

  const selectedProject = useMemo(() => {
    const pid = detail?.projectId;
    if (!pid) return null;
    return projects.find((p) => p.id === pid) ?? detail?.project ?? null;
  }, [detail?.projectId, detail?.project, projects]);

  const saveTitle = useCallback(async () => {
    if (!detail) return;
    const next = titleDraft.trim();
    if (!next) {
      setTitleDraft(detail.title);
      return;
    }
    if (next === detail.title) return;
    const prev = detail.title;
    setDetail({ ...detail, title: next });
    try {
      await updateMeetingField(detail.id, "title", next);
      onRefresh();
    } catch (e) {
      setDetail({ ...detail, title: prev });
      setTitleDraft(prev);
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  }, [detail, titleDraft, onRefresh]);

  const saveDate = async (ymd: string) => {
    if (!detail) return;
    const prevIso = detail.date;
    const nextIso = ymd ? ymdToIsoDate(ymd) : null;
    if (!nextIso) return;
    setDetail({ ...detail, date: nextIso });
    try {
      await updateMeetingField(detail.id, "date", ymd);
      onRefresh();
    } catch (e) {
      setDetail({ ...detail, date: prevIso });
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const saveStartTime = async () => {
    if (!detail) return;
    const norm = startDraft.trim() || null;
    const cur = detail.startTime?.trim() || null;
    if (norm === cur) return;
    const prev = detail.startTime;
    setDetail({ ...detail, startTime: norm });
    try {
      await updateMeetingField(detail.id, "startTime", norm);
      onRefresh();
    } catch (e) {
      setDetail({ ...detail, startTime: prev });
      setStartDraft(timeToInput(prev));
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const saveEndTime = async () => {
    if (!detail) return;
    const norm = endDraft.trim() || null;
    const cur = detail.endTime?.trim() || null;
    if (norm === cur) return;
    const prev = detail.endTime;
    setDetail({ ...detail, endTime: norm });
    try {
      await updateMeetingField(detail.id, "endTime", norm);
      onRefresh();
    } catch (e) {
      setDetail({ ...detail, endTime: prev });
      setEndDraft(timeToInput(prev));
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const onProjectPick = async (projectId: string | null) => {
    if (!detail) return;
    const prevPid = detail.projectId;
    const prevProj = detail.project;
    setProjectOpen(false);
    setProjectSearch("");
    if (projectId === prevPid) return;
    setDetail({
      ...detail,
      projectId,
      project: projectId
        ? projects.find((p) => p.id === projectId) ?? detail.project
        : null,
    });
    try {
      if (projectId == null) {
        await unlinkMeetingFromProject(detail.id);
      } else {
        await linkMeetingToProject(detail.id, projectId);
      }
      onRefresh();
    } catch (e) {
      setDetail({ ...detail, projectId: prevPid, project: prevProj });
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const toggleCompleted = async () => {
    if (!detail) return;
    const prev = detail.completed;
    setDetail({ ...detail, completed: !prev });
    try {
      await toggleMeetingCompleted(detail.id);
      onRefresh();
    } catch (e) {
      setDetail({ ...detail, completed: prev });
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const descriptionDirty = !notesAreEqual(noteDraft, latestNoteContent);

  const saveNote = async () => {
    if (!detail) return;
    if (!descriptionDirty) return;
    if (!normalizeNoteForCompare(noteDraft)) return;
    const t = noteDraft.trim();
    setNoteError("");
    const prevNotes = detail.notes;
    try {
      const created = await createMeetingNote(detail.id, t);
      setDetail({
        ...detail,
        notes: [...prevNotes, created].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        ),
      });
      setNoteDraft(created.content);
      onRefresh();
      toast.success("Beskrivelse gemt");
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : "Kunne ikke gemme.");
    }
  };

  const sendComment = async () => {
    if (!detail) return;
    const t = commentDraft.trim();
    if (!t) return;
    try {
      await createMeetingComment(detail.id, t);
      setCommentDraft("");
      const next = await getMeetingWithDetails(detail.id);
      setDetail(next);
      toast.success("Kommentar tilføjet");
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const panelTitleId = useId();
  const completed = detail?.completed ?? false;
  const notes = detail?.notes ?? [];
  const notesNewestFirst = useMemo(
    () => [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notes],
  );

  const comments = detail?.comments ?? [];

  const el = (
    <AnimatePresence>
      {open && meetingId ? (
        <>
          <motion.button
            key="meeting-panel-overlay"
            type="button"
            aria-label="Luk mødepanel"
            className="fixed inset-0 z-40 cursor-default border-0 bg-[rgba(0,0,0,0.15)] p-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            key="meeting-panel-aside"
            role="dialog"
            aria-modal="true"
            aria-labelledby={panelTitleId}
            className="fixed bottom-0 left-[220px] right-0 top-0 z-50 flex w-[calc(100vw-220px)] flex-col overflow-hidden border-l border-[#e8e8e8] bg-white shadow-[0_0_24px_rgba(0,0,0,0.06)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ willChange: "transform" }}
          >
            <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#e8e8e8] px-5">
              <button
                type="button"
                onClick={() => void toggleCompleted()}
                disabled={!detail}
                className="inline-flex items-center gap-2 border-0 bg-transparent p-0 font-body text-sm font-medium disabled:opacity-50"
              >
                <CheckCircle2
                  className={`h-[18px] w-[18px] shrink-0 ${
                    completed ? "text-[#16a34a]" : "text-[#9ca3af]"
                  }`}
                  aria-hidden
                  strokeWidth={2}
                />
                <span
                  style={{ color: completed ? "#16a34a" : "#9ca3af" }}
                >
                  {completed ? "Gennemført" : "Marker gennemført"}
                </span>
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-on-surface hover:bg-[#f8f9fa]"
                aria-label="Luk"
                onClick={onClose}
              >
                <X className="h-4 w-4 text-[#0f1923]" aria-hidden />
              </button>
            </header>

            {loadError ? (
              <p className="p-5 text-sm text-[#dc2626]">{loadError}</p>
            ) : !detail ? (
              <p className="p-5 text-sm text-[#9ca3af]">Indlæser…</p>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-0 pb-0">
                    <div className="px-5 pb-2 pt-5">
                      <label className="sr-only" htmlFor={panelTitleId}>
                        Mødetitel
                      </label>
                      <input
                        id={panelTitleId}
                        type="text"
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={() => void saveTitle()}
                        placeholder="Mødetitel…"
                        className="w-full border-0 border-b-2 border-transparent bg-transparent pb-1 font-body text-[20px] font-semibold leading-snug text-[#0f1923] outline-none placeholder:text-[#9ca3af] focus:border-b-2 focus:border-[#1a3167]"
                      />
                    </div>

                    <div className="mb-3 border-t border-b border-[#f3f4f6]">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-5 py-[10px]">
                        <div className={fieldCellClass}>
                          <span className={fieldLabelClass}>Dato</span>
                          <div className="min-w-0 [&_button]:right-0 [&_button]:top-1/2 [&_button]:-translate-y-1/2">
                            <DatePicker
                              value={dateYmd}
                              onChange={setDateYmd}
                              onBlurCommit={(c) => void saveDate(c)}
                              placeholder="Vælg dato"
                              className={`!rounded-md !border-0 !bg-transparent !px-0 !py-0 !pr-8 !text-[13px] !font-medium !leading-normal !text-[#0f1923] !shadow-none !ring-0 focus:!border-0 focus:!ring-0`}
                            />
                          </div>
                        </div>

                        <div className={`${fieldCellClass} relative`}>
                          <span className={fieldLabelClass}>Projekt</span>
                          <button
                            type="button"
                            onClick={() => setProjectOpen((o) => !o)}
                            className="flex w-full items-center gap-2 text-left text-[13px] font-medium text-[#0f1923]"
                          >
                            {selectedProject ? (
                              <>
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: selectedProject.color,
                                  }}
                                />
                                <span
                                  className="truncate"
                                  style={{ color: selectedProject.color }}
                                >
                                  {selectedProject.name}
                                </span>
                              </>
                            ) : (
                              <span className="text-[#9ca3af]">Ingen projekt</span>
                            )}
                          </button>
                          <input
                            type="text"
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            onFocus={() => setProjectOpen(true)}
                            placeholder="Søg projekt..."
                            className="mt-1 w-full rounded border border-[#e8e8e8] px-2 py-1 text-[11px] outline-none focus:border-[#1a3167]"
                          />
                          {projectOpen ? (
                            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border border-[#e8e8e8] bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() => void onProjectPick(null)}
                                className="flex w-full px-3 py-2 text-left text-[13px] text-[#6b7280] hover:bg-[#f8f9fa]"
                              >
                                Ingen projekt
                              </button>
                              {filteredProjects.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => void onProjectPick(p.id)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[#f8f9fa]"
                                >
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: p.color }}
                                  />
                                  <span style={{ color: p.color }}>{p.name}</span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className={fieldCellClass}>
                          <span className={fieldLabelClass}>Starttidspunkt</span>
                          <div className="relative min-h-[28px]">
                            {!startDraft ? (
                              <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#9ca3af]">
                                Ingen
                              </span>
                            ) : null}
                            <input
                              type="time"
                              value={startDraft}
                              onChange={(e) => setStartDraft(e.target.value)}
                              onBlur={() => void saveStartTime()}
                              className={`relative w-full border-0 bg-transparent text-[13px] font-medium outline-none ${
                                !startDraft ? "text-transparent" : "text-[#0f1923]"
                              }`}
                            />
                          </div>
                        </div>

                        <div className={fieldCellClass}>
                          <span className={fieldLabelClass}>Sluttidspunkt</span>
                          <div className="relative min-h-[28px]">
                            {!endDraft ? (
                              <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#9ca3af]">
                                Ingen
                              </span>
                            ) : null}
                            <input
                              type="time"
                              value={endDraft}
                              onChange={(e) => setEndDraft(e.target.value)}
                              onBlur={() => void saveEndTime()}
                              className={`relative w-full border-0 bg-transparent text-[13px] font-medium outline-none ${
                                !endDraft ? "text-transparent" : "text-[#0f1923]"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pb-2">
                      <div className="flex items-center justify-between px-[20px] pb-[6px] pt-[10px]">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-[#9ca3af]">
                          BESKRIVELSE
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowChangeLog((v) => !v)}
                          className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[11px] text-[#6b7280] hover:text-[#0f1923]"
                        >
                          {showChangeLog ? (
                            <>
                              Skjul ændringslog
                              <ChevronUp className="h-3 w-3 shrink-0" aria-hidden />
                            </>
                          ) : (
                            <>
                              Se ændringslog
                              <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
                            </>
                          )}
                        </button>
                      </div>

                      {showChangeLog ? (
                        <div className="mb-4 px-[20px]">
                          {notesNewestFirst.length === 0 ? (
                            <p className="text-[13px] text-[#9ca3af]">
                              Ingen beskrivelse endnu.
                            </p>
                          ) : (
                            <ul className="relative list-none space-y-3 border-l border-[#e8e8e8] pl-0">
                              {notesNewestFirst.map((n) => (
                                <li
                                  key={n.id}
                                  className="relative pb-0 pl-5 last:pb-0"
                                >
                                  <span
                                    className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[#1a3167]"
                                    aria-hidden
                                  />
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-[12px] font-medium text-[#0f1923]">
                                      {displayName(n.author)}
                                    </span>
                                    <span className="shrink-0 whitespace-nowrap text-right text-[11px] text-[#9ca3af]">
                                      {formatNoteDetailTimestamp(n.createdAt)}
                                    </span>
                                  </div>
                                  <div
                                    className="prose-content ml-4 mt-1"
                                    dangerouslySetInnerHTML={{
                                      __html: initialContentFromNote(n.content),
                                    }}
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null}

                      <div
                        className="px-[20px]"
                        aria-invalid={noteError ? true : undefined}
                      >
                        <RichTextEditor
                          key={detail.id}
                          content={noteDraft}
                          onChange={(html) => {
                            setNoteDraft(html);
                            if (noteError) setNoteError("");
                          }}
                          placeholder="Tilføj en beskrivelse..."
                          minHeight={240}
                        />
                        {noteError ? (
                          <p
                            className="mt-2 text-[12px] text-[#dc2626]"
                            role="alert"
                          >
                            {noteError}
                          </p>
                        ) : null}
                        {descriptionDirty ? (
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => void saveNote()}
                              className="rounded-[5px] bg-[#1a3167] px-4 py-1.5 font-body text-[12px] font-medium text-white hover:opacity-90"
                              style={{ margin: "8px 20px 0 0" }}
                            >
                              Gem
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 overflow-visible">
                  <TodoSection
                    todos={detail.todos}
                    taskId={null}
                    meetingId={detail.id}
                    onTodosReplace={(next) =>
                      setDetail((d) => (d ? { ...d, todos: next } : null))
                    }
                  />

                  <button
                    type="button"
                    className="flex h-[44px] w-full shrink-0 items-center justify-between border-t border-[#e8e8e8] bg-white px-[20px]"
                    onClick={() => setCommentsOpen((o) => !o)}
                  >
                    <span className="flex items-center gap-2">
                      {commentsOpen ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-[#6b7280]" aria-hidden strokeWidth={2} />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-[#6b7280]" aria-hidden strokeWidth={2} />
                      )}
                      <span className="text-[13px] font-medium text-[#0f1923]">
                        Kommentarer
                      </span>
                    </span>
                    <span className="relative flex items-center">
                      {comments.length > 0 ? (
                        <>
                          <span className="flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#1a3167] px-[5px] text-[11px] font-semibold text-white">
                            {comments.length}
                          </span>
                          {commentUnread ? (
                            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#dc2626]" />
                          ) : null}
                        </>
                      ) : null}
                    </span>
                  </button>

                  <motion.div
                    initial={false}
                    animate={{ height: commentsOpen ? 280 : 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden border-t border-[#e8e8e8] bg-white"
                  >
                    <div className="flex h-[280px] flex-col">
                      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                        {comments.length === 0 ? (
                          <p className="text-[13px] text-[#9ca3af]">
                            Ingen kommentarer endnu.
                          </p>
                        ) : null}
                        {comments.map((c) => {
                          const isMe = c.author.id === currentUserId;
                          const label = isMe ? "Du" : displayName(c.author);
                          return (
                            <div key={c.id} className="mb-4 last:mb-0">
                              <div className="flex gap-2">
                                <div
                                  className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#1a3167] text-[11px] font-bold text-white"
                                  aria-hidden
                                >
                                  {initialsFromUser(c.author)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-[13px] font-medium text-[#0f1923]">
                                      {label}
                                    </span>
                                    <span className="shrink-0 whitespace-nowrap text-[11px] text-[#9ca3af]">
                                      {formatNoteDetailTimestamp(c.createdAt)}
                                    </span>
                                  </div>
                                  <p className="ml-[38px] mt-1 whitespace-pre-wrap text-[13px] leading-snug text-[#0f1923]">
                                    {c.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="shrink-0 border-t border-[#e8e8e8] px-4 py-3">
                        <div className="flex items-end gap-2">
                          <textarea
                            value={commentDraft}
                            onChange={(e) => setCommentDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                void sendComment();
                              }
                            }}
                            rows={2}
                            placeholder="Skriv…"
                            className="min-h-0 min-w-0 flex-1 resize-none rounded-md border border-[#e8e8e8] px-3 py-2 font-body text-[13px] text-[#0f1923] outline-none focus:border-[#1a3167]"
                          />
                          <button
                            type="button"
                            onClick={() => void sendComment()}
                            className="shrink-0 rounded-[5px] bg-[#1a3167] px-[14px] py-1.5 font-body text-[12px] font-medium text-white hover:opacity-90"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(el, document.body);
}
