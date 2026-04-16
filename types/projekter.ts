import type {
  Priority,
  ProjectStatus,
  RoutineInterval,
  TaskStatus,
} from "@prisma/client";

/** Minimal task row for Gantt (level 2). */
export type GanttTaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  startDate: string | null;
  deadline: string | null;
  createdAt: string;
};

/** Serializable project row for Projekter list/kanban */
export type ProjectListItem = {
  id: string;
  name: string;
  /** Hex from project palette (e.g. #1a3167). */
  color: string;
  status: ProjectStatus;
  priority: Priority;
  deadline: string | null;
  /** ISO; project schedule start (Gantt). */
  startDate: string | null;
  isRoutine: boolean;
  routineInterval: RoutineInterval | null;
  createdAt: string;
  owner: { id: string; name: string };
  contacts: { id: string; name: string }[];
  tasks: { status: TaskStatus; deadline: string | null }[];
};
