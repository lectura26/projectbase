"use client";

import type { ActivityType, Priority, ProjectStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { updateProjectStatus, type EditProjectInitial } from "@/app/(dashboard)/projekter/actions";
import {
  addProjectComment,
  addTaskComment,
  confirmActivity,
  createCalendarEvent,
  createProjectFileRecord,
  createTask,
  cycleTaskStatus,
  deleteActivity,
  deleteProjectFile,
  updateTaskFields,
} from "@/app/(dashboard)/projekter/project-detail-actions";
import { createClient } from "@/lib/supabase/client";
import {
  displayName,
  initialsFromString,
  initialsFromUser,
} from "@/lib/projekter/display";
import { routineIntervalLabel } from "@/lib/projekter/routine";
import type { ProjectDetailPayload, TaskDetailDTO } from "@/types/project-detail";
import { NytProjektModal } from "@/components/projekter/NytProjektModal";

type UserOption = { id: string; name: string; email: string };

type TabKey = "opgaver" | "kommentarer" | "aktivitet" | "kalender" | "filer";

const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Ikke startet" },
  { value: "IN_PROGRESS", label: "I gang" },
  { value: "WAITING", label: "Afventer" },
  { value: "COMPLETED", label: "Afsluttet" },
];

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Lav",
  MEDIUM: "Medium",
  HIGH: "Høj",
};

function priorityClass(p: Priority) {
  if (p === "HIGH") return "bg-error-container text-on-error-container";
  if (p === "LOW") return "bg-secondary-container text-on-secondary-container";
  return "bg-tertiary-fixed-dim/40 text-primary";
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityClass(priority)}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function activityBadge(type: ActivityType) {
  switch (type) {
    case "MAIL":
      return { letter: "M", className: "bg-blue-600 text-white" };
    case "MEETING":
      return { letter: "T", className: "bg-green-600 text-white" };
    case "NOTE":
      return { letter: "N", className: "bg-amber-500 text-white" };
    default:
      return { letter: "F", className: "bg-slate-500 text-white" };
  }
}

function formatDaDate(iso: string) {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDaTime(iso: string) {
  return new Date(iso).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  initial: ProjectDetailPayload;
  usersForModal: UserOption[];
  storageBucket: string;
};

export default function ProjectDetailClient({
  initial,
  usersForModal,
  storageBucket,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("opgaver");
  const [editOpen, setEditOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [hoverActivityId, setHoverActivityId] = useState<string | null>(null);
  const [hoverFileId, setHoverFileId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [projectCommentDraft, setProjectCommentDraft] = useState("");
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showAktivitet = initial.activities.length > 0;
  // Always show Kalender/Filer so the first event/file can be added (Kommentarer-style UX).
  const showKalender = true;
  const showFiler = true;

  useEffect(() => {
    if (activeTab === "aktivitet" && !showAktivitet) setActiveTab("opgaver");
  }, [activeTab, showAktivitet]);

  const progress = useMemo(() => {
    const n = initial.tasks.length;
    if (n === 0) return 0;
    const done = initial.tasks.filter((t) => t.status === "DONE").length;
    return Math.round((done / n) * 100);
  }, [initial.tasks]);

  const assigneeOptions = useMemo(() => {
    const m = new Map<string, (typeof initial.owner)>();
    m.set(initial.owner.id, initial.owner);
    for (const mem of initial.members) {
      m.set(mem.user.id, mem.user);
    }
    return Array.from(m.values());
  }, [initial]);

  const calendarGroups = useMemo(() => {
    const m = new Map<string, ProjectDetailPayload["calendarEvents"]>();
    for (const e of initial.calendarEvents) {
      const k = e.date.slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [initial.calendarEvents]);

  const editInitial: EditProjectInitial = useMemo(
    () => ({
      name: initial.name,
      description: initial.description ?? "",
      deadline: initial.deadline ? initial.deadline.slice(0, 10) : "",
      priority: initial.priority,
      visibility: initial.visibility,
      tags: initial.tags,
      isRoutine: initial.isRoutine,
      routineInterval: initial.routineInterval,
      contactName: initial.contacts[0]?.name ?? "",
      contactEmail: initial.contacts[0]?.email ?? "",
    }),
    [initial],
  );

  const onStatusChange = async (next: ProjectStatus) => {
    try {
      const r = await updateProjectStatus(initial.id, next);
      if (r.routineRestarted) {
        toast.success(`Rutineprojekt genstartet: ${r.routineRestarted.name}`);
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunne ikke opdatere status.");
    }
  };

  const tabBtn = (key: TabKey, label: string, visible: boolean) =>
    visible ? (
      <button
        type="button"
        key={key}
        onClick={() => setActiveTab(key)}
        className={`border-b-2 px-3 py-2 font-body text-sm font-medium transition-colors ${
          activeTab === key
            ? "border-[#1a3167] text-[#1a3167]"
            : "border-transparent text-on-surface-variant hover:text-on-surface"
        }`}
      >
        {label}
      </button>
    ) : null;

  return (
    <div className="rounded-xl border border-app-topbar-border bg-surface-container-lowest">
      <div className="border-b border-outline-variant/15 px-6 pb-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-headline text-2xl font-semibold text-[#1a3167] sm:text-3xl">
              {initial.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-sidebar text-xs font-bold text-white">
                  {initialsFromUser(initial.owner)}
                </span>
                <span className="font-body font-medium text-on-surface">
                  {displayName(initial.owner)}
                </span>
              </div>
              {initial.deadline ? (
                <span className="text-on-surface-variant">
                  Frist {formatDaDate(initial.deadline)}
                </span>
              ) : null}
              <PriorityBadge priority={initial.priority} />
              <span className="text-on-surface-variant">
                Fremskridt {progress}%
              </span>
            </div>
            {initial.isRoutine && initial.routineInterval ? (
              <p className="mt-2 flex items-center gap-1 font-body text-xs text-on-surface-variant/80">
                <span className="material-symbols-outlined text-base">repeat</span>
                {routineIntervalLabel(initial.routineInterval)}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label className="sr-only" htmlFor="project-status">
              Status
            </label>
            <select
              id="project-status"
              value={initial.status}
              onChange={(e) => onStatusChange(e.target.value as ProjectStatus)}
              className="rounded-lg border border-app-topbar-border bg-white px-3 py-2 font-body text-sm text-[#1a3167] focus:outline-none focus:ring-2 focus:ring-app-sidebar/30"
            >
              {PROJECT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-app-topbar-border text-app-sidebar hover:bg-secondary-container/50"
              aria-label="Rediger projekt"
            >
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
          </div>
        </div>

        {initial.contacts.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {initial.contacts.map((c) => (
              <span
                key={c.id}
                title={`${c.email} — åbn mail`}
                className="group inline-flex cursor-default items-center gap-2 rounded-full border border-app-topbar-border bg-surface-container-low px-3 py-1.5 font-body text-xs font-medium text-on-surface"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-app-sidebar text-[10px] font-bold text-white">
                  {initialsFromString(c.name)}
                </span>
                {c.name}
                <a
                  href={`mailto:${c.email}`}
                  className="hidden text-[#1a3167] underline group-hover:inline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {c.email}
                </a>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-outline-variant/10 px-4">
        {tabBtn("opgaver", "Opgaver", true)}
        {tabBtn("kommentarer", "Kommentarer", true)}
        {tabBtn("aktivitet", "Aktivitet", showAktivitet)}
        {tabBtn("kalender", "Kalender", showKalender)}
        {tabBtn("filer", "Filer", showFiler)}
      </div>

      <div className="p-6">
        {activeTab === "opgaver" ? (
          <OpgaverTab
            projectId={initial.id}
            tasks={initial.tasks}
            assigneeOptions={assigneeOptions}
            expandedTaskId={expandedTaskId}
            setExpandedTaskId={setExpandedTaskId}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            routerRefresh={() => router.refresh()}
          />
        ) : null}
        {activeTab === "kommentarer" ? (
          <KommentarerTab
            initial={initial}
            draft={projectCommentDraft}
            setDraft={setProjectCommentDraft}
            onRefresh={() => router.refresh()}
          />
        ) : null}
        {activeTab === "aktivitet" ? (
          <AktivitetTab
            initial={initial}
            hoverActivityId={hoverActivityId}
            setHoverActivityId={setHoverActivityId}
            onRefresh={() => router.refresh()}
          />
        ) : null}
        {activeTab === "kalender" ? (
          <KalenderTab
            calendarGroups={calendarGroups}
            calendarColor={initial.calendarColor}
            eventFormOpen={eventFormOpen}
            setEventFormOpen={setEventFormOpen}
            eventTitle={eventTitle}
            setEventTitle={setEventTitle}
            eventDate={eventDate}
            setEventDate={setEventDate}
            eventTime={eventTime}
            setEventTime={setEventTime}
            projectId={initial.id}
            onRefresh={() => router.refresh()}
          />
        ) : null}
        {activeTab === "filer" ? (
          <FilerTab
            initial={initial}
            storageBucket={storageBucket}
            fileInputRef={fileInputRef}
            hoverFileId={hoverFileId}
            setHoverFileId={setHoverFileId}
            onRefresh={() => router.refresh()}
          />
        ) : null}
      </div>

      <NytProjektModal
        key={`${initial.id}-${initial.updatedAt}`}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        users={usersForModal}
        mode="edit"
        projectId={initial.id}
        initialEdit={editInitial}
      />
    </div>
  );
}

function OpgaverTab({
  projectId,
  tasks,
  assigneeOptions,
  expandedTaskId,
  setExpandedTaskId,
  newTaskTitle,
  setNewTaskTitle,
  routerRefresh,
}: {
  projectId: string;
  tasks: TaskDetailDTO[];
  assigneeOptions: ProjectDetailPayload["owner"][];
  expandedTaskId: string | null;
  setExpandedTaskId: (id: string | null) => void;
  newTaskTitle: string;
  setNewTaskTitle: (s: string) => void;
  routerRefresh: () => void;
}) {
  const cycle = async (taskId: string, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    try {
      await cycleTaskStatus(taskId);
      routerRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fejl");
    }
  };

  const toggleRow = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const addTask = async () => {
    const t = newTaskTitle.trim();
    if (!t) return;
    try {
      await createTask(projectId, t);
      setNewTaskTitle("");
      routerRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fejl");
    }
  };

  return (
    <div className="space-y-1">
      {tasks.map((task) => {
        const done = task.status === "DONE";
        const expanded = expandedTaskId === task.id;
        return (
          <div
            key={task.id}
            className="rounded-lg border border-outline-variant/15 bg-surface-container-low/50"
          >
            <button
              type="button"
              onClick={() => toggleRow(task.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => cycle(task.id, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void cycle(task.id, e);
                  }
                }}
                className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 ${
                  task.status === "DONE"
                    ? "border-green-600 bg-green-600 text-white"
                    : task.status === "IN_PROGRESS"
                      ? "border-[#1a3167] bg-[#1a3167]/10"
                      : "border-outline-variant text-transparent"
                }`}
              >
                {task.status === "DONE" ? (
                  <span className="material-symbols-outlined text-lg">check</span>
                ) : null}
              </span>
              <span
                className={`min-w-0 flex-1 font-body text-sm font-medium ${
                  done ? "text-on-surface-variant line-through" : "text-on-surface"
                }`}
              >
                {task.title}
              </span>
              {task.assignee ? (
                <span className="hidden shrink-0 rounded-full bg-app-sidebar/15 px-2 py-0.5 text-[11px] font-bold text-app-sidebar sm:inline">
                  {initialsFromUser(task.assignee)}
                </span>
              ) : null}
              {task.deadline ? (
                <span className="hidden text-xs text-on-surface-variant sm:inline">
                  {formatDaDate(task.deadline)}
                </span>
              ) : null}
              <PriorityBadge priority={task.priority} />
            </button>
            {expanded ? (
              <TaskExpanded
                task={task}
                assigneeOptions={assigneeOptions}
                onRefresh={routerRefresh}
              />
            ) : null}
          </div>
        );
      })}
      <div className="pt-4">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addTask();
            }
          }}
          placeholder="Tilføj opgave..."
          className="w-full rounded-lg border border-dashed border-app-topbar-border bg-transparent px-3 py-2 font-body text-sm placeholder:text-on-surface-variant focus:border-app-sidebar focus:outline-none"
        />
      </div>
    </div>
  );
}

function TaskExpanded({
  task,
  assigneeOptions,
  onRefresh,
}: {
  task: TaskDetailDTO;
  assigneeOptions: ProjectDetailPayload["owner"][];
  onRefresh: () => void;
}) {
  const [desc, setDesc] = useState(task.description ?? "");
  const [comment, setComment] = useState("");

  useEffect(() => {
    setDesc(task.description ?? "");
  }, [task.description, task.id]);

  const saveDesc = async () => {
    if (desc === (task.description ?? "")) return;
    try {
      await updateTaskFields({
        taskId: task.id,
        description: desc || null,
      });
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const saveDeadline = async (v: string) => {
    try {
      await updateTaskFields({
        taskId: task.id,
        deadline: v || null,
      });
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const saveAssignee = async (userId: string) => {
    try {
      await updateTaskFields({
        taskId: task.id,
        userId: userId || null,
      });
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const savePriority = async (p: Priority) => {
    try {
      await updateTaskFields({ taskId: task.id, priority: p });
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const sendComment = async () => {
    const t = comment.trim();
    if (!t) return;
    try {
      await addTaskComment(task.id, t);
      setComment("");
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  return (
    <div className="border-t border-outline-variant/10 bg-white px-4 py-4" onClick={(e) => e.stopPropagation()}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Beskrivelse
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => void saveDesc()}
            rows={3}
            className="mt-1 w-full rounded-lg border border-outline-variant/30 px-3 py-2 font-body text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Frist
          </label>
          <input
            type="date"
            defaultValue={task.deadline ? task.deadline.slice(0, 10) : ""}
            onChange={(e) => void saveDeadline(e.target.value)}
            className="mt-1 w-full rounded-lg border border-outline-variant/30 px-3 py-2 font-body text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Ansvarlig
          </label>
          <select
            value={task.assignee?.id ?? ""}
            onChange={(e) => void saveAssignee(e.target.value)}
            className="mt-1 w-full rounded-lg border border-outline-variant/30 px-3 py-2 font-body text-sm"
          >
            <option value="">—</option>
            {assigneeOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {displayName(u)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Prioritet
          </label>
          <select
            value={task.priority}
            onChange={(e) => void savePriority(e.target.value as Priority)}
            className="mt-1 w-full rounded-lg border border-outline-variant/30 px-3 py-2 font-body text-sm"
          >
            <option value="LOW">Lav</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">Høj</option>
          </select>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-outline-variant/15 bg-surface-container-low/40 p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Kommentarer
        </p>
        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {task.comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-sidebar text-[10px] font-bold text-white">
                {initialsFromUser(c.author)}
              </span>
              <div>
                <p className="text-on-surface">{c.content}</p>
                <p className="text-[11px] text-on-surface-variant">
                  {formatDaDate(c.createdAt)} · {formatDaTime(c.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void sendComment();
              }
            }}
            placeholder="Skriv en kommentar…"
            className="min-w-0 flex-1 rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void sendComment()}
            className="rounded-lg bg-[#1a3167] px-4 py-2 text-sm font-medium text-white"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function KommentarerTab({
  initial,
  draft,
  setDraft,
  onRefresh,
}: {
  initial: ProjectDetailPayload;
  draft: string;
  setDraft: (s: string) => void;
  onRefresh: () => void;
}) {
  const send = async () => {
    const t = draft.trim();
    if (!t) return;
    try {
      await addProjectComment(initial.id, t);
      setDraft("");
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  return (
    <div className="flex max-h-[min(70vh,640px)] flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-1">
        {initial.projectComments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a3167] text-xs font-semibold text-white">
              {initialsFromUser(c.author)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[13px] font-medium text-on-surface">
                  {displayName(c.author)}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {formatDaDate(c.createdAt)} {formatDaTime(c.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-on-surface">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 border-t border-outline-variant/15 bg-surface-container-lowest pt-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          rows={3}
          placeholder="Skriv en kommentar…"
          className="w-full rounded-lg border border-app-topbar-border px-3 py-2 font-body text-sm"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => void send()}
            className="rounded-lg bg-[#1a3167] px-6 py-2 text-sm font-medium text-white"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function AktivitetTab({
  initial,
  hoverActivityId,
  setHoverActivityId,
  onRefresh,
}: {
  initial: ProjectDetailPayload;
  hoverActivityId: string | null;
  setHoverActivityId: (id: string | null) => void;
  onRefresh: () => void;
}) {
  const onConfirm = async (id: string) => {
    try {
      await confirmActivity(id);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteActivity(id);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  return (
    <ul className="space-y-2">
      {initial.activities.map((a) => {
        const b = activityBadge(a.type);
        const hover = hoverActivityId === a.id;
        return (
          <li
            key={a.id}
            className="relative flex items-start gap-3 rounded-lg border border-outline-variant/15 px-3 py-3"
            onMouseEnter={() => setHoverActivityId(a.id)}
            onMouseLeave={() => setHoverActivityId(null)}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${b.className}`}
            >
              {b.letter}
            </span>
            <div className="min-w-0 flex-1">
              <span
                className="cursor-not-allowed font-body text-sm font-medium text-on-surface"
                title="Kommer med Microsoft-integration"
              >
                {a.title}
              </span>
              <p className="text-xs text-on-surface-variant">
                {(a.organizerName || a.source) && `${a.organizerName || a.source} · `}
                {formatDaDate(a.date)}
              </p>
            </div>
            {a.autoMatched ? (
              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                AI
              </span>
            ) : null}
            {hover ? (
              <div className="absolute right-2 top-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => void onConfirm(a.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-800 hover:bg-green-200"
                  aria-label="Bekræft"
                >
                  <span className="material-symbols-outlined text-lg">check</span>
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(a.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-800 hover:bg-red-200"
                  aria-label="Slet"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function KalenderTab({
  calendarGroups,
  calendarColor,
  eventFormOpen,
  setEventFormOpen,
  eventTitle,
  setEventTitle,
  eventDate,
  setEventDate,
  eventTime,
  setEventTime,
  projectId,
  onRefresh,
}: {
  calendarGroups: [string, ProjectDetailPayload["calendarEvents"]][];
  calendarColor: string;
  eventFormOpen: boolean;
  setEventFormOpen: (v: boolean) => void;
  eventTitle: string;
  setEventTitle: (s: string) => void;
  eventDate: string;
  setEventDate: (s: string) => void;
  eventTime: string;
  setEventTime: (s: string) => void;
  projectId: string;
  onRefresh: () => void;
}) {
  const save = async () => {
    const title = eventTitle.trim();
    if (!title || !eventDate) {
      toast.error("Titel og dato påkrævet.");
      return;
    }
    try {
      await createCalendarEvent({
        projectId,
        title,
        date: eventDate,
        time: eventTime || null,
      });
      setEventTitle("");
      setEventDate("");
      setEventTime("");
      setEventFormOpen(false);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setEventFormOpen(!eventFormOpen)}
          className="rounded-lg border border-app-topbar-border px-3 py-1.5 font-body text-sm font-medium text-[#1a3167]"
        >
          Tilføj begivenhed
        </button>
      </div>
      {eventFormOpen ? (
        <div className="mb-6 grid max-w-md gap-3 rounded-lg border border-app-topbar-border p-4 md:grid-cols-2">
          <input
            type="text"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="Titel"
            className="md:col-span-2 rounded border px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEventFormOpen(false)}
              className="text-sm text-on-surface-variant"
            >
              Annuller
            </button>
            <button
              type="button"
              onClick={() => void save()}
              className="rounded-lg bg-[#1a3167] px-4 py-2 text-sm text-white"
            >
              Gem
            </button>
          </div>
        </div>
      ) : null}
      <div className="space-y-6">
        {calendarGroups.map(([day, events]) => (
          <div key={day}>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              {formatDaDate(`${day}T12:00:00.000Z`)}
            </p>
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: calendarColor }}
                  />
                  <span className="font-medium">{e.title}</span>
                  {e.eventTime ? (
                    <span className="text-on-surface-variant">{e.eventTime}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilerTab({
  initial,
  storageBucket,
  fileInputRef,
  hoverFileId,
  setHoverFileId,
  onRefresh,
}: {
  initial: ProjectDetailPayload;
  storageBucket: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  hoverFileId: string | null;
  setHoverFileId: (id: string | null) => void;
  onRefresh: () => void;
}) {
  const pick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const supabase = createClient();
      const safe = file.name.replace(/[^\w.\-()+ ]/g, "_");
      const path = `${initial.id}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from(storageBucket)
        .upload(path, file, { upsert: false });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
      await createProjectFileRecord({
        projectId: initial.id,
        name: file.name,
        fileType: file.type || file.name.split(".").pop() || "fil",
        url: data.publicUrl,
        storagePath: path,
      });
      toast.success("Fil uploadet");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fejlede");
    }
  };

  const remove = async (f: ProjectDetailPayload["files"][0]) => {
    try {
      const { storagePath } = await deleteProjectFile(f.id);
      if (storagePath) {
        const supabase = createClient();
        await supabase.storage.from(storageBucket).remove([storagePath]);
      }
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fejl");
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(ev) => void onFile(ev)}
        />
        <button
          type="button"
          onClick={pick}
          className="rounded-lg border border-app-topbar-border px-3 py-1.5 font-body text-sm font-medium text-[#1a3167]"
        >
          Upload
        </button>
      </div>
      <ul className="divide-y divide-outline-variant/10">
        {initial.files.map((f) => (
          <li
            key={f.id}
            className="relative flex items-center gap-4 py-3"
            onMouseEnter={() => setHoverFileId(f.id)}
            onMouseLeave={() => setHoverFileId(null)}
          >
            <div className="min-w-0 flex-1">
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#1a3167] hover:underline"
              >
                {f.name}
              </a>
              <p className="text-xs text-on-surface-variant">
                {f.fileType} · {formatDaDate(f.createdAt)} ·{" "}
                {displayName(f.uploadedBy)}
              </p>
            </div>
            {hoverFileId === f.id ? (
              <button
                type="button"
                onClick={() => void remove(f)}
                className="text-error"
                aria-label="Slet fil"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
