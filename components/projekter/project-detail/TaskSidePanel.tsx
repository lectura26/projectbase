"use client";

import type { Priority, TaskStatus } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronUp, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  addTaskComment,
  createTaskNote,
  setTaskStatus,
  updateTaskFields,
  updateTaskTitle,
} from "@/app/(dashboard)/projekter/project-detail-actions";
import { displayName, initialsFromUser } from "@/lib/projekter/display";
import {
  commitYmdString,
  isoToYmd,
  ymdToIsoDate,
} from "@/lib/datetime/ymd";
import type { TaskDetailDTO, TaskNoteDTO, UserMini } from "@/types/project-detail";
import { DatePicker } from "@/components/ui/DatePicker";
import { TodoSection } from "@/components/projekter/project-detail/TodoSection";

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

function taskViewedStorageKey(taskId: string) {
  return `task_viewed_${taskId}`;
}

function taskStatusLabel(s: TaskStatus): string {
  switch (s) {
    case "TODO":
      return "Ikke startet";
    case "IN_PROGRESS":
      return "I gang";
    case "DONE":
      return "Fuldført";
    default:
      return s;
  }
}

function priorityDotClass(p: Priority): string {
  switch (p) {
    case "HIGH":
      return "bg-[#dc2626]";
    case "MEDIUM":
      return "bg-[#d97706]";
    case "LOW":
      return "bg-[#16a34a]";
    default:
      return "bg-[#9ca3af]";
  }
}

function priorityLabel(p: Priority): string {
  switch (p) {
    case "HIGH":
      return "Høj";
    case "MEDIUM":
      return "Mellem";
    case "LOW":
      return "Lav";
    default:
      return p;
  }
}

function isDeadlineOverdue(isoDeadline: string | null, status: TaskStatus): boolean {
  if (!isoDeadline || status === "DONE") return false;
  const d = new Date(isoDeadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

type Props = {
  open: boolean;
  task: TaskDetailDTO | undefined;
  projectId: string;
  projectName: string;
  currentUserId: string;
  currentUserMini: UserMini;
  patchTask: (taskId: string, patch: Partial<TaskDetailDTO>) => void;
  onRefresh: () => void;
  onClose: () => void;
  onMarkTaskViewed: () => void;
};

export function TaskSidePanel({
  open,
  task: taskProp,
  projectId,
  projectName,
  currentUserId,
  currentUserMini,
  patchTask,
  onRefresh,
  onClose,
  onMarkTaskViewed,
}: Props) {
  const task = taskProp;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [titleDraft, setTitleDraft] = useState("");
  const [startYmd, setStartYmd] = useState("");
  const [deadlineYmd, setDeadlineYmd] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [viewTick, setViewTick] = useState(0);
  const [noteError, setNoteError] = useState("");
  const [showChangeLog, setShowChangeLog] = useState(false);

  const latestNoteContent = useMemo(() => {
    const n = task?.notes ?? [];
    if (!n.length) return "";
    const sorted = [...n].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return sorted[sorted.length - 1].content;
  }, [task?.notes]);

  useEffect(() => {
    if (!task) return;
    setTitleDraft(task.title);
    setStartYmd(isoToYmd(task.startDate));
    setDeadlineYmd(isoToYmd(task.deadline));
    setCommentDraft("");
    setCommentsOpen(false);
    setShowChangeLog(false);
  }, [task?.id, task?.title, task?.startDate, task?.deadline]);

  useEffect(() => {
    if (!task) return;
    setNoteDraft(latestNoteContent);
    setNoteError("");
  }, [task?.id, latestNoteContent]);

  useEffect(() => {
    if (open && task && typeof window !== "undefined") {
      const key = taskViewedStorageKey(task.id);
      localStorage.setItem(key, String(Date.now()));
      onMarkTaskViewed();
      setViewTick((t) => t + 1);
    }
  }, [open, task?.id, task, onMarkTaskViewed]);

  const lastViewedMs = useMemo(() => {
    if (typeof window === "undefined" || !task) return null;
    const raw = localStorage.getItem(taskViewedStorageKey(task.id));
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }, [task?.id, task?.comments, open, viewTick]);

  const commentUnread = useMemo(() => {
    if (!task?.comments.length) return false;
    const latest = Math.max(
      ...task.comments.map((c) => new Date(c.createdAt).getTime()),
    );
    if (lastViewedMs == null) return true;
    return latest > lastViewedMs;
  }, [task?.comments, lastViewedMs]);

  const saveTitle = useCallback(async () => {
    if (!task) return;
    const next = titleDraft.trim();
    if (!next) {
      setTitleDraft(task.title);
      return;
    }
    if (next === task.title) return;
    const prev = task.title;
    patchTask(task.id, { title: next });
    try {
      await updateTaskTitle(task.id, next);
      onRefresh();
    } catch (e) {
      patchTask(task.id, { title: prev });
      setTitleDraft(prev);
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  }, [task, titleDraft, patchTask, onRefresh]);

  const toggleMarkerDone = async () => {
    if (!task) return;
    const next: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
    const prev = task.status;
    patchTask(task.id, { status: next });
    try {
      await setTaskStatus(task.id, next);
      if (next === "DONE") toast.success("Opgave fuldført");
      onRefresh();
    } catch (e) {
      patchTask(task.id, { status: prev });
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const saveStartDate = async (ymd: string) => {
    if (!task) return;
    const prev = task.startDate;
    const nextIso = ymd ? ymdToIsoDate(ymd) : null;
    patchTask(task.id, { startDate: nextIso });
    try {
      await updateTaskFields({ taskId: task.id, startDate: ymd || null });
      onRefresh();
    } catch (e) {
      patchTask(task.id, { startDate: prev });
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const saveDeadline = async (ymd: string) => {
    if (!task) return;
    const prev = task.deadline;
    const nextIso = ymd ? ymdToIsoDate(ymd) : null;
    patchTask(task.id, { deadline: nextIso });
    try {
      await updateTaskFields({ taskId: task.id, deadline: ymd || null });
      onRefresh();
    } catch (e) {
      patchTask(task.id, { deadline: prev });
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const savePriority = async (p: Priority) => {
    if (!task) return;
    const prev = task.priority;
    patchTask(task.id, { priority: p });
    try {
      await updateTaskFields({ taskId: task.id, priority: p });
      onRefresh();
    } catch (e) {
      patchTask(task.id, { priority: prev });
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const saveStatus = async (s: TaskStatus) => {
    if (!task) return;
    const prev = task.status;
    patchTask(task.id, { status: s });
    try {
      await setTaskStatus(task.id, s);
      onRefresh();
    } catch (e) {
      patchTask(task.id, { status: prev });
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const descriptionDirty =
    noteDraft.trim() !== latestNoteContent.trim();

  const saveNote = async () => {
    if (!task) return;
    const t = noteDraft.trim();
    if (!t || !descriptionDirty) return;
    setNoteError("");
    const prevNotes = task.notes;
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: TaskNoteDTO = {
      id: optimisticId,
      content: t,
      createdAt: new Date().toISOString(),
      author: currentUserMini,
    };
    patchTask(task.id, { notes: [...prevNotes, optimistic] });
    try {
      const created = await createTaskNote(task.id, t);
      patchTask(task.id, {
        notes: [...prevNotes, created].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      });
      setNoteDraft(created.content);
      onRefresh();
    } catch (e) {
      patchTask(task.id, { notes: prevNotes });
      setNoteDraft(t);
      setNoteError(e instanceof Error ? e.message : "Kunne ikke gemme beskrivelsen.");
    }
  };

  const sendComment = async () => {
    if (!task) return;
    const t = commentDraft.trim();
    if (!t) return;
    try {
      await addTaskComment(task.id, t);
      setCommentDraft("");
      toast.success("Kommentar tilføjet");
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const panelTitleId = useId();
  const done = task?.status === "DONE";
  const notes = task?.notes ?? [];
  const notesNewestFirst = useMemo(
    () => [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notes],
  );

  const fieldCellClass =
    "flex min-h-0 min-w-0 cursor-pointer flex-col rounded-[6px] bg-[#f8f9fa] px-3 py-2 transition-colors hover:bg-[#f0f6ff]";
  const fieldLabelClass =
    "mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-[#9ca3af]";

  const el = (
    <AnimatePresence>
      {open && task ? (
        <>
          <motion.button
            key="task-panel-overlay"
            type="button"
            aria-label="Luk opgavepanel"
            className="fixed inset-0 z-40 cursor-default border-0 bg-[rgba(0,0,0,0.15)] p-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            key="task-panel-aside"
            role="dialog"
            aria-modal="true"
            aria-labelledby={panelTitleId}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-[540px] min-[1280px]:w-[620px] flex-col overflow-hidden border-l border-[#e8e8e8] bg-white shadow-[0_0_24px_rgba(0,0,0,0.06)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ willChange: "transform" }}
          >
            <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#e8e8e8] px-5">
              <button
                type="button"
                onClick={() => void toggleMarkerDone()}
                className="inline-flex items-center gap-2 font-body text-sm font-medium"
              >
                <CheckCircle2
                  className={`h-[18px] w-[18px] shrink-0 ${done ? "text-[#16a34a]" : "text-[#9ca3af]"}`}
                  aria-hidden
                  strokeWidth={2}
                />
                <span style={{ color: done ? "#16a34a" : "#9ca3af" }}>
                  {done ? "Fuldført" : "Marker fuldført"}
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

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-0 pb-0">
                  <div className="px-5 pb-2 pt-5">
                    <label className="sr-only" htmlFor={panelTitleId}>
                      Opgavetitel
                    </label>
                    <input
                      id={panelTitleId}
                      type="text"
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={() => void saveTitle()}
                      placeholder="Opgavenavn..."
                      className="w-full border-0 border-b-2 border-transparent bg-transparent pb-1 font-body text-[20px] font-semibold leading-snug text-[#0f1923] outline-none placeholder:text-[#9ca3af] focus:border-b-2 focus:border-[#1a3167]"
                    />
                  </div>

                  <div className="mb-3 border-t border-b border-[#f3f4f6]">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-5 py-[10px]">
                      <div className={fieldCellClass}>
                        <span className={fieldLabelClass}>Status</span>
                        <div className="relative min-w-0">
                          <select
                            value={task.status}
                            onChange={(e) =>
                              void saveStatus(e.target.value as TaskStatus)
                            }
                            className="w-full cursor-pointer appearance-none border-0 bg-transparent pr-6 text-[13px] font-medium text-[#0f1923] outline-none focus:ring-0"
                          >
                            {(["TODO", "IN_PROGRESS", "DONE"] as const).map(
                              (s) => (
                                <option key={s} value={s}>
                                  {taskStatusLabel(s)}
                                </option>
                              ),
                            )}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]"
                            aria-hidden
                            strokeWidth={2}
                          />
                        </div>
                      </div>

                      <div className={fieldCellClass}>
                        <span className={fieldLabelClass}>Prioritet</span>
                        <div className="relative min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block h-2 w-2 shrink-0 rounded-full ${priorityDotClass(task.priority)}`}
                              aria-hidden
                            />
                            <select
                              value={task.priority}
                              onChange={(e) =>
                                void savePriority(e.target.value as Priority)
                              }
                              className="min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent pr-6 text-[13px] font-medium text-[#0f1923] outline-none focus:ring-0"
                            >
                              {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => (
                                <option key={p} value={p}>
                                  {priorityLabel(p)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <ChevronDown
                            className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]"
                            aria-hidden
                            strokeWidth={2}
                          />
                        </div>
                      </div>

                      <div className={fieldCellClass}>
                        <span className={fieldLabelClass}>Startdato</span>
                        <div className="min-w-0 [&_button]:right-0 [&_button]:top-1/2 [&_button]:-translate-y-1/2">
                          <DatePicker
                            value={startYmd}
                            onChange={setStartYmd}
                            onBlurCommit={(c) => void saveStartDate(c)}
                            placeholder="Ingen"
                            className={`!rounded-md !border-0 !bg-transparent !px-0 !py-0 !pr-8 !text-[13px] !font-medium !leading-normal !shadow-none !ring-0 focus:!border-0 focus:!ring-0 ${
                              commitYmdString(startYmd)
                                ? "!text-[#0f1923]"
                                : "!text-[#9ca3af] placeholder:!text-[#9ca3af]"
                            }`}
                          />
                        </div>
                      </div>

                      <div className={fieldCellClass}>
                        <span className={fieldLabelClass}>Deadline</span>
                        <div className="min-w-0 [&_button]:right-0 [&_button]:top-1/2 [&_button]:-translate-y-1/2">
                          <DatePicker
                            value={deadlineYmd}
                            onChange={setDeadlineYmd}
                            onBlurCommit={(c) => void saveDeadline(c)}
                            placeholder="Ingen"
                            className={`!rounded-md !border-0 !bg-transparent !px-0 !py-0 !pr-8 !text-[13px] !font-medium !leading-normal !shadow-none !ring-0 focus:!border-0 focus:!ring-0 ${
                              !commitYmdString(deadlineYmd)
                                ? "!text-[#9ca3af] placeholder:!text-[#9ca3af]"
                                : isDeadlineOverdue(task.deadline, task.status)
                                  ? "!text-[#dc2626]"
                                  : "!text-[#0f1923]"
                            }`}
                          />
                        </div>
                      </div>

                      <div className={`${fieldCellClass} col-span-2`}>
                        <span className={fieldLabelClass}>Projekt</span>
                        <Link
                          href={`/projekter/${projectId}`}
                          className="text-[13px] font-medium text-[#1a3167] hover:underline"
                          onClick={onClose}
                        >
                          {projectName}
                        </Link>
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
                          <p className="text-[13px] text-[#9ca3af]">Ingen beskrivelse endnu.</p>
                        ) : (
                          <ul className="relative list-none space-y-3 border-l border-[#e8e8e8] pl-0">
                            {notesNewestFirst.map((n) => (
                              <li key={n.id} className="relative pb-0 pl-5 last:pb-0">
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
                                <p className="ml-4 mt-1 whitespace-pre-wrap text-[13px] leading-[1.6] text-[#0f1923]">
                                  {n.content}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}

                    <div className="px-[20px]">
                      <textarea
                        value={noteDraft}
                        onChange={(e) => {
                          setNoteDraft(e.target.value);
                          if (noteError) setNoteError("");
                        }}
                        placeholder="Tilføj en beskrivelse..."
                        rows={5}
                        aria-invalid={noteError ? true : undefined}
                        aria-describedby={noteError ? "task-note-error" : undefined}
                        className="min-h-[120px] max-h-[300px] w-full resize-y rounded-[6px] border border-[#e8e8e8] px-[14px] py-[10px] font-body text-[13px] leading-[1.7] text-[#0f1923] outline-none placeholder:text-[#9ca3af] focus:border-[#1a3167]"
                      />
                      {noteError ? (
                        <p id="task-note-error" className="mt-2 text-[12px] text-[#dc2626]" role="alert">
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
                  todos={task.todos}
                  taskId={task.id}
                  meetingId={null}
                  onTodosReplace={(next) => patchTask(task.id, { todos: next })}
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
                    {task.comments.length > 0 ? (
                      <>
                        <span className="flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#1a3167] px-[5px] text-[11px] font-semibold text-white">
                          {task.comments.length}
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
                      {task.comments.length === 0 ? (
                        <p className="text-[13px] text-[#9ca3af]">Ingen kommentarer endnu.</p>
                      ) : null}
                      {task.comments.map((c) => {
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
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(el, document.body);
}
