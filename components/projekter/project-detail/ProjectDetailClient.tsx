"use client";

import type { ActivityType, Priority, ProjectStatus, TaskStatus } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, Plus, Repeat, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  updateProjectStatus,
  type EditProjectInitial,
  updateProjectSchedule,
} from "@/app/(dashboard)/projekter/actions";
import {
  addProjectComment,
  confirmActivity,
  createProjectFileRecord,
  createTask,
  deleteActivity,
  deleteProjectFile,
  setTaskStatus,
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
import type { ProjectDetailPayload, TaskDetailDTO, UserMini } from "@/types/project-detail";
import { NytProjektModal } from "@/components/projekter/NytProjektModal";
import { ProjectKalenderTab } from "@/components/projekter/project-detail/ProjectKalenderTab";
import { TaskSidePanel } from "@/components/projekter/project-detail/TaskSidePanel";
import { DatePicker } from "@/components/ui/DatePicker";
import { formatDanishDate } from "@/lib/datetime/format-danish";
import { commitYmdString, isoToYmd } from "@/lib/datetime/ymd";

type UserOption = { id: string; name: string; email: string };

type TabKey = "opgaver" | "kommentarer" | "aktivitet" | "kalender" | "filer";

const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Ikke startet" },
  { value: "IN_PROGRESS", label: "I gang" },
  { value: "WAITING", label: "Afventer" },
  { value: "COMPLETED", label: "Afsluttet" },
];

/** Checkbox: ét klik = færdig / ikke færdig (ikke 3-trins cyklus). */
function toggleDoneTaskStatus(current: TaskStatus): TaskStatus {
  return current === "DONE" ? "TODO" : "DONE";
}

const EASE_STANDARD: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

function TaskCycleButton({
  task,
  onCycle,
}: {
  task: TaskDetailDTO;
  onCycle: () => void;
}) {
  const done = task.status === "DONE";
  const inProgress = task.status === "IN_PROGRESS";
  return (
    <button
      type="button"
      aria-label="Skift opgavestatus"
      className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 outline-none [touch-action:manipulation] ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary/40"
      onClick={(e) => {
        e.stopPropagation();
        onCycle();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCycle();
        }
      }}
    >
      <motion.div
        className="pointer-events-none flex h-full w-full items-center justify-center rounded-full border-2"
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
            <motion.div
              key="check"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15, ease: EASE_STANDARD }}
              className="flex items-center justify-center"
            >
              <Check className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </button>
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

function formatDaTime(iso: string) {
  return new Date(iso).toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TASK_VIEWED_PREFIX = "task_viewed_";

function taskViewedStorageKey(taskId: string) {
  return `${TASK_VIEWED_PREFIX}${taskId}`;
}

/** `sync` bumps when a task panel marks viewed so we re-read localStorage. */
function taskHasUnreadComments(task: TaskDetailDTO, sync: number): boolean {
  void sync;
  if (typeof window === "undefined") return false;
  if (!task.comments.length) return false;
  const raw = localStorage.getItem(taskViewedStorageKey(task.id));
  const last = raw ? parseInt(raw, 10) : NaN;
  const latest = Math.max(
    ...task.comments.map((c) => new Date(c.createdAt).getTime()),
  );
  if (!raw || !Number.isFinite(last)) return true;
  return latest > last;
}

function resolveCurrentUserMini(initial: ProjectDetailPayload, currentUserId: string): UserMini {
  if (initial.owner.id === currentUserId) return initial.owner;
  const m = initial.members.find((x) => x.user.id === currentUserId);
  return m?.user ?? initial.owner;
}

type Props = {
  initial: ProjectDetailPayload;
  usersForModal: UserOption[];
  currentUserId: string;
};

export default function ProjectDetailClient({
  initial,
  usersForModal,
  currentUserId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>("opgaver");
  const [editOpen, setEditOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const deepLinkHandledFor = useRef<string | null>(null);
  const [hoverActivityId, setHoverActivityId] = useState<string | null>(null);
  const [hoverFileId, setHoverFileId] = useState<string | null>(null);
  const [projectCommentDraft, setProjectCommentDraft] = useState("");
  const [scheduleStart, setScheduleStart] = useState(() => isoToYmd(initial.startDate));
  const [scheduleDeadline, setScheduleDeadline] = useState(() => isoToYmd(initial.deadline));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tasks, setTasks] = useState<TaskDetailDTO[]>(initial.tasks);
  const [projectStatusOverride, setProjectStatusOverride] = useState<ProjectStatus | null>(null);

  const displayProjectStatus = projectStatusOverride ?? initial.status;

  useEffect(() => {
    setTasks(initial.tasks);
    setProjectStatusOverride(null);
  }, [initial.id, initial.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps -- sync when server payload revision changes

  useEffect(() => {
    setScheduleStart(isoToYmd(initial.startDate));
    setScheduleDeadline(isoToYmd(initial.deadline));
  }, [initial.startDate, initial.deadline, initial.updatedAt]);

  const saveScheduleField = async (field: "startDate" | "deadline", ymd: string) => {
    const prev = field === "startDate" ? scheduleStart : scheduleDeadline;
    try {
      if (field === "startDate") {
        setScheduleStart(ymd);
      } else {
        setScheduleDeadline(ymd);
      }
      await updateProjectSchedule(initial.id, {
        [field]: ymd || null,
      });
      router.refresh();
    } catch (e) {
      if (field === "startDate") setScheduleStart(prev);
      else setScheduleDeadline(prev);
      toast.error(e instanceof Error ? e.message : "Kunne ikke gemme dato.");
    }
  };

  const showAktivitet = initial.activities.length > 0;
  // Always show Kalender/Filer so the first event/file can be added (Kommentarer-style UX).
  const showKalender = true;
  const showFiler = true;

  useEffect(() => {
    if (activeTab === "aktivitet" && !showAktivitet) setActiveTab("opgaver");
  }, [activeTab, showAktivitet]);

  const progress = useMemo(() => {
    const n = tasks.length;
    if (n === 0) return 0;
    const done = tasks.filter((t) => t.status === "DONE").length;
    return Math.round((done / n) * 100);
  }, [tasks]);

  const taskIdFromQuery = searchParams.get("taskId");

  useEffect(() => {
    if (!taskIdFromQuery) {
      deepLinkHandledFor.current = null;
      return;
    }
    if (deepLinkHandledFor.current === taskIdFromQuery) return;
    const exists = tasks.some((t) => t.id === taskIdFromQuery);
    if (!exists) return;
    deepLinkHandledFor.current = taskIdFromQuery;
    setActiveTab("opgaver");
    setExpandedTaskId(taskIdFromQuery);
    setHighlightTaskId(taskIdFromQuery);
    const fade = window.setTimeout(() => setHighlightTaskId(null), 1000);
    requestAnimationFrame(() => {
      document
        .getElementById(`task-row-${taskIdFromQuery}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => clearTimeout(fade);
  }, [taskIdFromQuery, tasks]);

  const assigneeOptions = useMemo(() => {
    const m = new Map<string, (typeof initial.owner)>();
    m.set(initial.owner.id, initial.owner);
    for (const mem of initial.members) {
      m.set(mem.user.id, mem.user);
    }
    return Array.from(m.values());
  }, [initial]);

  const editInitial: EditProjectInitial = useMemo(
    () => ({
      name: initial.name,
      description: initial.description ?? "",
      startDate: isoToYmd(initial.startDate),
      deadline: isoToYmd(initial.deadline),
      priority: initial.priority,
      visibility: initial.visibility,
      tags: initial.tags,
      isRoutine: initial.isRoutine,
      routineInterval: initial.routineInterval,
      contactName: initial.contacts[0]?.name ?? "",
      contactEmail: initial.contacts[0]?.email ?? "",
      color: initial.color,
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
      <div
        className="border-b border-outline-variant/15 px-6 pb-4 pt-6"
        style={{ borderLeft: `4px solid ${initial.color}` }}
      >
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
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-on-surface-variant">
                {scheduleStart ? (
                  <>
                    <span>Startdato</span>
                    <DatePicker
                      value={scheduleStart}
                      onChange={setScheduleStart}
                      onBlurCommit={(c) => void saveScheduleField("startDate", c)}
                      className="w-[min(100%,152px)] rounded border border-outline-variant/30 bg-white px-2 py-1 font-body text-sm text-on-surface"
                    />
                    {scheduleDeadline ? (
                      <span className="text-on-surface-variant" aria-hidden>
                        →
                      </span>
                    ) : null}
                  </>
                ) : null}
                <span>Frist</span>
                <DatePicker
                  value={scheduleDeadline}
                  onChange={setScheduleDeadline}
                  onBlurCommit={(c) => void saveScheduleField("deadline", c)}
                  className="w-[min(100%,152px)] rounded border border-outline-variant/30 bg-white px-2 py-1 font-body text-sm text-on-surface"
                />
              </div>
              <PriorityBadge priority={initial.priority} />
              <span className="text-on-surface-variant">
                Fremskridt {progress}%
              </span>
            </div>
            {initial.isRoutine && initial.routineInterval ? (
              <p className="mt-2 flex items-center gap-1 font-body text-xs text-on-surface-variant/80">
                <Repeat className="h-4 w-4 shrink-0" aria-hidden />
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
              <Pencil className="h-5 w-5" aria-hidden />
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
            projectName={initial.name}
            tasks={tasks}
            setTasks={setTasks}
            assigneeOptions={assigneeOptions}
            expandedTaskId={expandedTaskId}
            setExpandedTaskId={setExpandedTaskId}
            highlightTaskId={highlightTaskId}
            currentUserId={currentUserId}
            currentUserMini={resolveCurrentUserMini(initial, currentUserId)}
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
          <ProjectKalenderTab
            initial={initial}
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
  projectName,
  tasks,
  setTasks,
  assigneeOptions,
  expandedTaskId,
  setExpandedTaskId,
  highlightTaskId,
  currentUserId,
  currentUserMini,
  routerRefresh,
}: {
  projectId: string;
  projectName: string;
  tasks: TaskDetailDTO[];
  setTasks: Dispatch<SetStateAction<TaskDetailDTO[]>>;
  assigneeOptions: ProjectDetailPayload["owner"][];
  expandedTaskId: string | null;
  setExpandedTaskId: (id: string | null) => void;
  highlightTaskId: string | null;
  currentUserId: string;
  currentUserMini: UserMini;
  routerRefresh: () => void;
}) {
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftDeadline, setDraftDeadline] = useState("");
  const [draftAssignee, setDraftAssignee] = useState("");
  const [draftPriority, setDraftPriority] = useState<Priority>("MEDIUM");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [taskViewSync, setTaskViewSync] = useState(0);

  const markTaskViewed = useCallback(() => {
    setTaskViewSync((n) => n + 1);
  }, []);

  const resetAddTaskForm = useCallback(() => {
    setDraftTitle("");
    setDraftDesc("");
    setDraftStartDate("");
    setDraftDeadline("");
    setDraftAssignee("");
    setDraftPriority("MEDIUM");
    setCreateError("");
  }, []);

  const openAddTaskForm = useCallback(() => {
    resetAddTaskForm();
    setAddTaskOpen(true);
  }, [resetAddTaskForm]);

  const cancelAddTask = useCallback(() => {
    resetAddTaskForm();
    setAddTaskOpen(false);
  }, [resetAddTaskForm]);

  const patchTask = useCallback((taskId: string, patch: Partial<TaskDetailDTO>) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  }, [setTasks]);

  const cycle = (taskId: string) => {
    let prevStatus: TaskStatus | undefined;
    let nextStatus: TaskStatus | undefined;
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;
      prevStatus = task.status;
      const next = toggleDoneTaskStatus(task.status);
      nextStatus = next;
      return prev.map((t) => (t.id === taskId ? { ...t, status: next } : t));
    });
    if (prevStatus === undefined || nextStatus === undefined) return;
    void setTaskStatus(taskId, nextStatus)
      .then(() => {
        if (nextStatus === "DONE") toast.success("Opgave fuldført");
      })
      .catch((err: unknown) => {
        patchTask(taskId, { status: prevStatus });
        toast.error(err instanceof Error ? err.message : "Fejl");
      });
  };

  const openTaskPanel = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const selectedTask =
    expandedTaskId === null
      ? undefined
      : tasks.find((t) => t.id === expandedTaskId);

  const submitNewTask = async () => {
    const t = draftTitle.trim();
    if (!t) {
      setCreateError("Titel er påkrævet.");
      return;
    }
    setCreateError("");
    setCreating(true);
    try {
      const created = await createTask(projectId, {
        title: t,
        description: draftDesc.trim() || null,
        startDate: commitYmdString(draftStartDate) || null,
        deadline: commitYmdString(draftDeadline) || null,
        userId: draftAssignee.trim() || null,
        priority: draftPriority,
      });
      resetAddTaskForm();
      setAddTaskOpen(false);
      setTasks((prev) => (prev.some((x) => x.id === created.id) ? prev : [...prev, created]));
      setExpandedTaskId(created.id);
      routerRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fejl");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-1">
      {tasks.length === 0 ? (
        <p className="py-2 text-sm text-on-surface-variant/90">Ingen opgaver endnu.</p>
      ) : null}
      {tasks.map((task) => {
        const done = task.status === "DONE";
        const selected = expandedTaskId === task.id;
        const showUnreadDot = taskHasUnreadComments(task, taskViewSync);
        return (
          <div
            key={task.id}
            id={`task-row-${task.id}`}
            className={`rounded-lg border border-outline-variant/15 transition-[background-color] duration-1000 ease-out ${
              selected
                ? "border-l-2 border-l-[#1a3167] bg-[#f0f6ff]"
                : highlightTaskId === task.id
                  ? "bg-[#f0f6ff]"
                  : "bg-surface-container-low/50"
            }`}
          >
            <div className="flex w-full cursor-pointer items-center gap-3 px-4 py-3">
              <TaskCycleButton task={task} onCycle={() => cycle(task.id)} />
              <div
                role="button"
                tabIndex={0}
                className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
                onClick={() => openTaskPanel(task.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openTaskPanel(task.id);
                  }
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left">
                  <TaskTitleAnimated task={task} done={done} />
                  {showUnreadDot ? (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#dc2626]"
                      title="Ulæste kommentarer"
                      aria-hidden
                    />
                  ) : null}
                </div>
                {task.assignee ? (
                  <span className="hidden shrink-0 rounded-full bg-primary-container/15 px-2 py-0.5 text-[11px] font-bold text-primary-container sm:inline">
                    {initialsFromUser(task.assignee)}
                  </span>
                ) : null}
                {task.deadline ? (
                  <span className="hidden text-xs text-on-surface-variant sm:inline">
                    {formatDanishDate(task.deadline)}
                  </span>
                ) : null}
                <PriorityBadge priority={task.priority} />
              </div>
            </div>
          </div>
        );
      })}
      <TaskSidePanel
        open={expandedTaskId !== null}
        task={selectedTask}
        projectId={projectId}
        projectName={projectName}
        currentUserId={currentUserId}
        currentUserMini={currentUserMini}
        patchTask={patchTask}
        onRefresh={routerRefresh}
        onClose={() => setExpandedTaskId(null)}
        onMarkTaskViewed={markTaskViewed}
      />
      <div className="rounded-lg border border-outline-variant/15 bg-surface-container-low/50">
        {!addTaskOpen ? (
          <button
            type="button"
            onClick={openAddTaskForm}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-outline-variant/40 text-on-surface-variant"
              aria-hidden
            >
              <Plus className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-body text-sm font-medium text-on-surface-variant">Tilføj opgave...</span>
          </button>
        ) : (
          <div className="bg-white px-4 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <label className="sr-only" htmlFor="new-task-title">
                Opgavetitel
              </label>
              <input
                id="new-task-title"
                type="text"
                value={draftTitle}
                onChange={(e) => {
                  setDraftTitle(e.target.value);
                  setCreateError("");
                }}
                autoFocus
                placeholder="Opgavetitel"
                className="w-full border-0 border-b border-transparent bg-transparent px-0 py-0.5 font-body text-sm font-medium text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-0"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Beskrivelse
                </label>
                <textarea
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-outline-variant/30 px-3 py-2 font-body text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Startdato
                </label>
                <DatePicker
                  value={draftStartDate}
                  onChange={setDraftStartDate}
                  className="mt-1 w-full rounded-lg border border-outline-variant/30 px-3 py-2 font-body text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Frist
                </label>
                <DatePicker
                  value={draftDeadline}
                  onChange={setDraftDeadline}
                  className="mt-1 w-full rounded-lg border border-outline-variant/30 px-3 py-2 font-body text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Ansvarlig
                </label>
                <select
                  value={draftAssignee}
                  onChange={(e) => setDraftAssignee(e.target.value)}
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
                  value={draftPriority}
                  onChange={(e) => setDraftPriority(e.target.value as Priority)}
                  className="mt-1 w-full rounded-lg border border-outline-variant/30 px-3 py-2 font-body text-sm"
                >
                  <option value="LOW">Lav</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">Høj</option>
                </select>
              </div>
            </div>
            {createError ? <p className="mt-3 text-xs text-error">{createError}</p> : null}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={creating}
                onClick={() => void submitNewTask()}
                className="rounded-lg bg-primary px-5 py-2.5 font-body text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
              >
                Opret opgave
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={cancelAddTask}
                className="rounded-lg px-4 py-2.5 font-body text-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              >
                Annuller
              </button>
            </div>
          </div>
        )}
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
                  {formatDanishDate(c.createdAt)} {formatDaTime(c.createdAt)}
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
                {formatDanishDate(a.date)}
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
                  <Check className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(a.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                  aria-label="Slet"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
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
  fileInputRef: React.RefObject<HTMLInputElement | null>;
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
                {f.fileType} · {formatDanishDate(f.createdAt)} ·{" "}
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
                <Trash2 className="h-5 w-5" aria-hidden />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
