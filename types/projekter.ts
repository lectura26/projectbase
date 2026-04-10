import type { Priority, ProjectStatus, RoutineInterval, TaskStatus } from "@prisma/client";

/** Serializable project row for Projekter list/kanban */
export type ProjectListItem = {
  id: string;
  name: string;
  status: ProjectStatus;
  priority: Priority;
  deadline: string | null;
  isRoutine: boolean;
  routineInterval: RoutineInterval | null;
  createdAt: string;
  owner: { id: string; name: string };
  contacts: { id: string; name: string }[];
  tasks: { status: TaskStatus }[];
};
