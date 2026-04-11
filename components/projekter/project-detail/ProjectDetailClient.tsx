"use client";

import type { ActivityType, Priority, ProjectStatus, TaskStatus } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
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
import { validateUploadFile } from "@/lib/storage/file-validation";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_STORAGE_BUCKET } from "@/lib/supabase/storage-bucket";
import {
  displayName,
  initialsFromString,
  initialsFromUser,
} from "@/lib/projekter/display";
import {
  BADGE_CHIP_CLASS,
  priorityBadgeClass,
  priorityLabelDa,
} from "@/components/projekter/project-helpers";
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

const TASK_CYCLE_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

function nextTaskStatus(current: TaskStatus): TaskStatus {
  return TASK_CYCLE_ORDER[(TASK_CYCLE_ORDER.indexOf(current) + 1) % TASK_CYCLE_ORDER.length];
}

const EASE_STANDARD: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

function TaskCycleButton({
  task,
  onCycle,
}: {
  task: TaskDetailDTO;
  onCycle: (e?: React.SyntheticEvent) => void;
}) {
  const done = task.status === "DONE";
  const inProgress = task.status === "IN_PROGRESS";
  return (
    <motion.span
      role="button"
      tabIndex={0}
      onClick={(e) => onCycle(e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCycle(e);
        }
      }}
      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-2"
      animate={
        done
          ? { borderColor: "#1a3167", backgroundColor: "#1a3167" }
          : inProgress
            ? {
                borderColor: "#1a3167",
                backgroundColor: "rgba(0, 27, 79, 0.1)",
              }
            : {
                borderColor: "#c5c6d1",
                backgroundColor: "#ffffff",
              }
      }
      transition={{ duration: 0.15, ease: EASE_STANDARD }}
    >
      <AnimatePresence initial={false}>
        {done ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15, ease: EASE_STANDARD }}
            className="material-symbols-outlined text-lg leading-none text-white"
          >
            check
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.span>
  );
}

function TaskTitleAnimated({ task, done }: { task: TaskDetailDTO; done: boolean }) {
  return (
    <motion.span
      className={`block min-w-0 font-body text-sm font-medium text-on-surface ${
        done ? "line-through" : ""
      }`}
      animate={{ opacity: done ? 0.5 : 1 }}
      transition={{ duration: 0.15, ease: EASE_STANDARD }}
    >
      {task.title}
    </motion.span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`${BADGE_CHIP_CLASS} ${priorityBadgeClass(priority)}`}>
      {priorityLabelDa(priority)}
    </span>
  );
}

function activityBadge(type: ActivityType) {
  switch (type) {
    case "MAIL":
      return { letter: "M", className: "bg-surface-container-high text-on-surface" };
    case "MEETING":
      return { letter: "T", className: "bg-surface-container-high text-on-surface" };
    case "NOTE":
      return { letter: "N", className: "bg-surface-container-high text-on-surface" };
    default:
      return { letter: "F", className: "bg-surface-container-high text-on-surface" };
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
};

export default function ProjectDetailClient({
  initial,
  usersForModal,
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

  const [tasksForProgress, setTasksForProgress] = useState<TaskDetailDTO[]>(initial.tasks);
  const [projectStatusOverride, setProjectStatusOverride] = useState<ProjectStatus | null>(null);

  const displayProjectStatus = projectStatusOverride ?? initial.status;

  useEffect(() => {
    setTasksForProgress(initial.tasks);
    setProjectStatusOverride(null);
  }, [initial.id, initial.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when server payload revision changes

  const showAktivitet = initial.activities.length > 0;
  // Always show Kalender/Filer so the first event/file can be added (Kommentarer-style UX).
  const showKalender = true;
  const showFiler = true;

  useEffect(() => {
    if (activeTab === "aktivitet" && !showAktivitet) setActiveTab("opgaver");
  }, [activeTab, showAktivitet]);

  const progress = useMemo(() => {
    const n = tasksForProgress.length;
    if (n === 0) return 0;
    const done = tasksForProgress.filter((t) => t.status === "DONE").length;
    return Math.round((done / n) * 100);
  }, [tasksForProgress]);

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
    setProjectStatusOverride(next);
    try {
      const r = await updateProjectStatus(initial.id, next);
      if (r.routineRestarted) {
        toast.success(`Rutineprojekt genstartet: ${r.routineRestarted.name}`);
      }
      router.refresh();
    } catch (e) {
      setProjectStatusOverride(null);
      toast.error(e instanceof Error ? e.message : "Kunne ikke opdatere status.");
    }
  };

  const tabBtn = (key: TabKey, label: string, visible: boolean) =>
    visible ? (
      <button
        type="button"
        key={key}
        onClick={() => setActiveTab(key)}
        className={`mr-8 border-b-2 pb-3 pt-1 font-body text-sm font-medium transition-colors last:mr-0 ${
          activeTab === key
            ? "border-primary text-primary"
            : "border-transparent text-on-surface-variant hover:text-primary"
        }`}
      >
        {label}
      </button>
    ) : null;

  return (
    <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest shadow-sm ring-1 ring-black/5">
      <div className="border-b border-outline-variant/15 px-6 pb-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-headline text-2xl font-semibold text-primary sm:text-3xl">
              {initial.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-white">
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
              value={displayProjectStatus}
              onChange={(e) => onStatusChange(e.target.value as ProjectStatus)}
              className="rounded-lg border border-outline-variant/20 bg-white px-3 py-2 font-body text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
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
                className="group inline-flex cursor-default items-center gap-2 rounded-md border border-outline-variant/20 bg-surface-container-low px-3 py-1.5 font-body text-xs font-medium text-on-surface"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-container text-[10px] font-bold text-white">
                  {initialsFromString(c.name)}
                </span>
                {c.name}
                <a
                  href={`mailto:${c.email}`}
                  className="hidden text-primary underline group-hover:inline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {c.email}
                </a>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="scrollbar-thin flex gap-2 overflow-x-auto border-b border-outline-variant/30 px-6">
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
            initialTasks={initial.tasks}
            serverUpdatedAt={initial.updatedAt}
            onTasksChange={setTasksForProgress}
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
  initialTasks,
  serverUpdatedAt,
  onTasksChange,
  assigneeOptions,
  expandedTaskId,
  setExpandedTaskId,
  newTaskTitle,
  setNewTaskTitle,
  routerRefresh,
}: {
  projectId: string;
  initialTasks: TaskDetailDTO[];
  serverUpdatedAt: string;
  onTasksChange: (tasks: TaskDetailDTO[]) => void;
  assigneeOptions: ProjectDetailPayload["owner"][];
  expandedTaskId: string | null;
  setExpandedTaskId: (id: string | null) => void;
  newTaskTitle: string;
  setNewTaskTitle: (s: string) => void;
  routerRefresh: () => void;
}) {
  const [newTaskError, setNewTaskError] = useState("");
  const [tasks, setTasks] = useState<TaskDetailDTO[]>(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [projectId, serverUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps -- reset from server revision, not every initialTasks identity

  useEffect(() => {
    onTasksChange(tasks);
  }, [tasks, onTasksChange]);

  const patchTask = useCallback((taskId: string, patch: Partial<TaskDetailDTO>) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  }, []);

  const cycle = (taskId: string, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const prevStatus = task.status;
    const optimistic = nextTaskStatus(prevStatus);
    patchTask(taskId, { status: optimistic });
    void cycleTaskStatus(taskId)
      .then((r) => {
        if (r.newStatus === "DONE") toast.success("Opgave fuldført");
      })
      .catch((err: unknown) => {
        patchTask(taskId, { status: prevStatus });
        toast.error(err instanceof Error ? err.message : "Fejl");
      });
  };

  const toggleRow = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const addTask = async () => {
    const t = newTaskTitle.trim();
    if (!t) {
      setNewTaskError("Titel er påkrævet.");
      return;
    }
    setNewTaskError("");
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
      {tasks.length === 0 ? (
        <p className="py-2 text-sm text-on-surface-variant/90">Ingen opgaver endnu.</p>
      ) : null}
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
              <TaskCycleButton task={task} onCycle={(e) => void cycle(task.id, e)} />
              <div className="min-w-0 flex-1 truncate text-left">
                <TaskTitleAnimated task={task} done={done} />
              </div>
              {task.assignee ? (
                <span className="hidden shrink-0 rounded-full bg-primary-container/15 px-2 py-0.5 text-[11px] font-bold text-primary-container sm:inline">
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
                patchTask={patchTask}
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
          onChange={(e) => {
            setNewTaskTitle(e.target.value);
            setNewTaskError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addTask();
            }
          }}
          placeholder="Tilføj opgave..."
          aria-invalid={Boolean(newTaskError)}
          className="w-full rounded-lg border border-dashed border-outline-variant/20 bg-transparent px-3 py-2 font-body text-sm placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
        />
        {newTaskError ? (
          <p className="mt-1.5 text-xs text-error">{newTaskError}</p>
        ) : null}
      </div>
    </div>
  );
}

function TaskExpanded({
  task,
  assigneeOptions,
  patchTask,
  onRefresh,
}: {
  task: TaskDetailDTO;
  assigneeOptions: ProjectDetailPayload["owner"][];
  patchTask: (taskId: string, patch: Partial<TaskDetailDTO>) => void;
  onRefresh: () => void;
}) {
  const [desc, setDesc] = useState(task.description ?? "");
  const [comment, setComment] = useState("");

  useEffect(() => {
    setDesc(task.description ?? "");
  }, [task.description, task.id]);

  const saveDesc = async () => {
    if (desc === (task.description ?? "")) return;
    const prev = task.description ?? null;
    patchTask(task.id, { description: desc || null });
    try {
      await updateTaskFields({
        taskId: task.id,
        description: desc || null,
      });
      onRefresh();
    } catch (e) {
      patchTask(task.id, { description: prev });
      setDesc(prev ?? "");
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const saveDeadline = async (v: string) => {
    const prev = task.deadline;
    const nextDeadline = v || null;
    patchTask(task.id, { deadline: nextDeadline });
    try {
      await updateTaskFields({
        taskId: task.id,
        deadline: nextDeadline,
      });
      onRefresh();
    } catch (e) {
      patchTask(task.id, { deadline: prev });
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const saveAssignee = async (userId: string) => {
    const prev = task.assignee;
    const nextUser = userId
      ? assigneeOptions.find((u) => u.id === userId) ?? null
      : null;
    patchTask(task.id, { assignee: nextUser });
    try {
      await updateTaskFields({
        taskId: task.id,
        userId: userId || null,
      });
      onRefresh();
    } catch (e) {
      patchTask(task.id, { assignee: prev });
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const savePriority = async (p: Priority) => {
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

  const sendComment = async () => {
    const t = comment.trim();
    if (!t) return;
    try {
      await addTaskComment(task.id, t);
      setComment("");
      toast.success("Kommentar tilføjet");
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
            key={task.deadline ?? "no-deadline"}
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
            key={task.assignee?.id ?? ""}
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
          {task.comments.length === 0 ? (
            <p className="text-[11px] text-on-surface-variant/90">Ingen kommentarer endnu.</p>
          ) : null}
          {task.comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-container text-[10px] font-bold text-white">
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
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
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
      toast.success("Kommentar tilføjet");
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  return (
    <div className="flex max-h-[min(70vh,640px)] flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-1">
        {initial.projectComments.length === 0 ? (
          <p className="text-sm text-on-surface-variant/90">Ingen kommentarer endnu.</p>
        ) : null}
        {initial.projectComments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
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
          className="w-full rounded-lg border border-outline-variant/20 px-3 py-2 font-body text-sm"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => void send()}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white"
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
  const [activities, setActivities] = useState(initial.activities);

  useEffect(() => {
    setActivities(initial.activities);
  }, [initial.id, initial.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps -- sync only when server revision changes; avoid resetting optimistic rows on every activities array identity

  const onConfirm = async (id: string) => {
    const prev = activities;
    setActivities((rows) =>
      rows.map((a) => (a.id === id ? { ...a, confirmed: true } : a)),
    );
    try {
      await confirmActivity(id);
      onRefresh();
    } catch (e) {
      setActivities(prev);
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  const onDelete = async (id: string) => {
    const prev = activities;
    setActivities((rows) => rows.filter((a) => a.id !== id));
    try {
      await deleteActivity(id);
      onRefresh();
    } catch (e) {
      setActivities(prev);
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  };

  return (
    <ul className="space-y-2">
      {activities.map((a) => {
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
            {hover && !a.confirmed ? (
              <div className="absolute right-2 top-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => void onConfirm(a.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                  aria-label="Bekræft"
                >
                  <span className="material-symbols-outlined text-lg">check</span>
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(a.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container-high"
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
  const [titleError, setTitleError] = useState("");
  const [dateError, setDateError] = useState("");

  const save = async () => {
    const title = eventTitle.trim();
    setTitleError("");
    setDateError("");
    let ok = true;
    if (!title) {
      setTitleError("Titel er påkrævet.");
      ok = false;
    }
    if (!eventDate) {
      setDateError("Dato er påkrævet.");
      ok = false;
    }
    if (!ok) return;
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
          onClick={() => {
            setEventFormOpen(!eventFormOpen);
            setTitleError("");
            setDateError("");
          }}
          className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-body text-sm font-medium text-primary"
        >
          Tilføj begivenhed
        </button>
      </div>
      {eventFormOpen ? (
        <div className="mb-6 grid max-w-md gap-3 rounded-lg border border-outline-variant/20 p-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => {
                setEventTitle(e.target.value);
                setTitleError("");
              }}
              placeholder="Titel"
              aria-invalid={Boolean(titleError)}
              className="w-full rounded border px-3 py-2 text-sm"
            />
            {titleError ? (
              <p className="mt-1 text-xs text-error">{titleError}</p>
            ) : null}
          </div>
          <div>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value);
                setDateError("");
              }}
              aria-invalid={Boolean(dateError)}
              className="w-full rounded border px-3 py-2 text-sm"
            />
            {dateError ? (
              <p className="mt-1 text-xs text-error">{dateError}</p>
            ) : null}
          </div>
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
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white"
            >
              Gem
            </button>
          </div>
        </div>
      ) : null}
      <div className="space-y-6">
        {calendarGroups.length === 0 ? (
          <p className="text-sm text-on-surface-variant/90">Ingen begivenheder i kalenderen endnu.</p>
        ) : null}
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
  fileInputRef,
  hoverFileId,
  setHoverFileId,
  onRefresh,
}: {
  initial: ProjectDetailPayload;
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
    const checked = validateUploadFile({
      size: file.size,
      name: file.name,
      type: file.type,
    });
    if (!checked.ok) {
      toast.error(checked.reason);
      return;
    }
    try {
      const supabase = createClient();
      const path = `${initial.id}/${crypto.randomUUID()}.${checked.ext}`;
      const { error: upErr } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(path, file, { upsert: false });
      if (upErr) {
        toast.error("Upload fejlede. Prøv igen.");
        return;
      }
      await createProjectFileRecord({
        projectId: initial.id,
        name: file.name,
        fileType: file.type || checked.ext,
        storagePath: path,
      });
      toast.success("Fil uploadet");
      onRefresh();
    } catch (err) {
      console.error("[upload file]", err);
      toast.error("Upload fejlede");
    }
  };

  const remove = async (f: ProjectDetailPayload["files"][0]) => {
    try {
      await deleteProjectFile(f.id);
      onRefresh();
    } catch (err) {
      console.error("[delete file]", err);
      toast.error("Kunne ikke slette filen");
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
          className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-body text-sm font-medium text-primary"
        >
          Upload
        </button>
      </div>
      {initial.files.length === 0 ? (
        <p className="text-sm text-on-surface-variant/90">Ingen filer uploadet endnu.</p>
      ) : null}
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
                className="font-medium text-primary hover:underline"
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
