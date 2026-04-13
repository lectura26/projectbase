"use client";

import type { Priority, TaskStatus } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  addTaskComment,
  setTaskStatus,
  updateTaskDescription,
  updateTaskFields,
  updateTaskTitle,
} from "@/app/(dashboard)/projekter/project-detail-actions";
import { displayName, initialsFromUser } from "@/lib/projekter/display";
import { formatDanishDate } from "@/lib/datetime/format-danish";
import {
  commitYmdString,
  isoToYmd,
  ymdToIsoDate,
} from "@/lib/datetime/ymd";
import type { TaskDetailDTO } from "@/types/project-detail";
import { DatePicker } from "@/components/ui/DatePicker";

function formatDaTime(iso: string) {
  return new Date(iso).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

function taskStatusChipClass(s: TaskStatus): string {
  switch (s) {
    case "TODO":
      return "bg-[#f3f4f6] text-[#6b7280]";
    case "IN_PROGRESS":
      return "bg-[#dbeafe] text-[#1e40af]";
    case "DONE":
      return "bg-[#dcfce7] text-[#15803d]";
    default:
      return "bg-[#f3f4f6] text-[#6b7280]";
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
  patchTask: (taskId: string, patch: Partial<TaskDetailDTO>) => void;
  onRefresh: () => void;
  onClose: () => void;
};

export function TaskSidePanel({
  open,
  task: taskProp,
  projectId,
  projectName,
  currentUserId,
  patchTask,
  onRefresh,
  onClose,
}: Props) {
  const task = taskProp;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [startYmd, setStartYmd] = useState("");
  const [deadlineYmd, setDeadlineYmd] = useState("");
  const [commentDraft, setCommentDraft] = useState("");

  useEffect(() => {
    if (!task) return;
    setTitleDraft(task.title);
    setDescDraft(task.description ?? "");
    setStartYmd(isoToYmd(task.startDate));
    setDeadlineYmd(isoToYmd(task.deadline));
  }, [task?.id, task?.title, task?.description, task?.startDate, task?.deadline, task]);

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

  const saveDesc = useCallback(async () => {
    if (!task) return;
    const next = descDraft.trim() ? descDraft : "";
    const normalized = next || null;
    if (normalized === (task.description ?? null)) return;
    const prev = task.description ?? null;
    patchTask(task.id, { description: normalized });
    try {
      await updateTaskDescription(task.id, normalized);
      onRefresh();
    } catch (e) {
      patchTask(task.id, { description: prev });
      setDescDraft(prev ?? "");
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  }, [task, descDraft, patchTask, onRefresh]);

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
            className="fixed bottom-0 right-0 top-0 z-50 flex w-[420px] min-[1280px]:w-[480px] flex-col overflow-hidden border-l border-[#e8e8e8] bg-white shadow-[0_0_24px_rgba(0,0,0,0.06)]"
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

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-0 pb-4">
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

                <div className="px-5 py-2">
                  <div className="flex h-9 items-center border-b border-[#f3f4f6]">
                    <span className="w-[120px] shrink-0 text-[13px] font-medium text-[#9ca3af]">
                      Status
                    </span>
                    <div className="flex min-w-0 flex-1 justify-end">
                      <select
                        value={task.status}
                        onChange={(e) =>
                          void saveStatus(e.target.value as TaskStatus)
                        }
                        className={`max-w-full cursor-pointer rounded px-2 py-0.5 text-[11px] font-semibold outline-none ring-offset-2 focus:ring-2 focus:ring-[#1a3167]/30 ${taskStatusChipClass(task.status)}`}
                      >
                        {(["TODO", "IN_PROGRESS", "DONE"] as const).map(
                          (s) => (
                            <option key={s} value={s}>
                              {taskStatusLabel(s)}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="flex h-9 items-center border-b border-[#f3f4f6]">
                    <span className="w-[120px] shrink-0 text-[13px] font-medium text-[#9ca3af]">
                      Prioritet
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${priorityDotClass(task.priority)}`}
                        aria-hidden
                      />
                      <select
                        value={task.priority}
                        onChange={(e) =>
                          void savePriority(e.target.value as Priority)
                        }
                        className="max-w-full cursor-pointer rounded border border-transparent bg-transparent py-1 text-right text-[13px] text-[#0f1923] outline-none focus:ring-2 focus:ring-[#1a3167]/20"
                      >
                        {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => (
                          <option key={p} value={p}>
                            {priorityLabel(p)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex min-h-9 items-center border-b border-[#f3f4f6] py-1">
                    <span className="w-[120px] shrink-0 text-[13px] font-medium text-[#9ca3af]">
                      Startdato
                    </span>
                    <div className="min-w-0 flex-1 [&_input]:text-right [&_input]:text-[13px]">
                      <DatePicker
                        value={startYmd}
                        onChange={setStartYmd}
                        onBlurCommit={(c) => void saveStartDate(c)}
                        placeholder={
                          commitYmdString(startYmd) ? "DD-MM-YYYY" : "Ingen startdato"
                        }
                        className={`border-0 bg-transparent !shadow-none !ring-0 focus:border-b-2 focus:border-[#1a3167] focus:!ring-0 ${
                          commitYmdString(startYmd)
                            ? "text-[#0f1923]"
                            : "text-[#9ca3af] placeholder:text-[#9ca3af]"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex min-h-9 items-center border-b border-[#f3f4f6] py-1">
                    <span className="w-[120px] shrink-0 text-[13px] font-medium text-[#9ca3af]">
                      Deadline
                    </span>
                    <div className="min-w-0 flex-1 [&_input]:text-right [&_input]:text-[13px]">
                      <DatePicker
                        value={deadlineYmd}
                        onChange={setDeadlineYmd}
                        onBlurCommit={(c) => void saveDeadline(c)}
                        placeholder={
                          commitYmdString(deadlineYmd)
                            ? "DD-MM-YYYY"
                            : "Ingen deadline"
                        }
                        className={`border-0 bg-transparent !shadow-none !ring-0 focus:border-b-2 focus:border-[#1a3167] focus:!ring-0 ${
                          !commitYmdString(deadlineYmd)
                            ? "text-[#9ca3af] placeholder:text-[#9ca3af]"
                            : isDeadlineOverdue(task.deadline, task.status)
                              ? "text-[#dc2626]"
                              : "text-[#0f1923]"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex h-9 items-center border-b border-[#f3f4f6]">
                    <span className="w-[120px] shrink-0 text-[13px] font-medium text-[#9ca3af]">
                      Projekt
                    </span>
                    <div className="min-w-0 flex-1 text-right">
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

                <p className="px-5 pb-2 pt-4 text-[11px] font-medium uppercase tracking-wide text-[#9ca3af]">
                  BESKRIVELSE
                </p>
                <textarea
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={() => void saveDesc()}
                  placeholder="Tilføj en beskrivelse..."
                  rows={5}
                  className="min-h-[100px] w-full resize-none border-0 bg-transparent px-5 py-0 font-body text-[14px] leading-[1.7] text-[#0f1923] outline-none placeholder:text-[#9ca3af]"
                />

                <div className="my-2 h-px bg-[#e8e8e8]" />

                <p className="px-5 pb-2 pt-2 text-[11px] font-medium uppercase tracking-wide text-[#9ca3af]">
                  KOMMENTARER
                </p>
                <div className="space-y-4 px-5 pb-4">
                  {task.comments.length === 0 ? (
                    <p className="text-[13px] text-[#9ca3af]">Ingen endnu.</p>
                  ) : null}
                  {task.comments.map((c) => {
                    const isMe = c.author.id === currentUserId;
                    const label = isMe ? "Du" : displayName(c.author);
                    return (
                      <div key={c.id} className="flex gap-2">
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
                              {formatDanishDate(c.createdAt)} ·{" "}
                              {formatDaTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-snug text-[#0f1923]">
                            {c.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-[#e8e8e8] px-4 py-3">
              <div className="flex items-end gap-3">
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
                  className="shrink-0 rounded-md bg-[#1a3167] px-4 py-1.5 font-body text-[13px] font-medium text-white hover:opacity-90"
                >
                  Send
                </button>
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
