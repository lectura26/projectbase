import type { Priority, ProjectStatus, TaskStatus } from "@prisma/client";

export type OversigtTaskRow = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  priority: Priority;
  status: TaskStatus;
  deadline: string | null;
};

export type OversigtPulseProject = {
  id: string;
  name: string;
  color: string;
  status: ProjectStatus;
  deadline: string | null;
  progress: number;
  initials: string;
};

export type OversigtDeadlineItem = {
  id: string;
  deadline: string;
  title: string;
  projectId: string;
  projectName: string;
  dotColor: string;
};

export type OversigtMeetingItem = {
  id: string;
  dateIso: string;
  timeLabel: string;
  title: string;
  projectId: string;
  projectName: string;
};

export type OversigtFocusSuggestion = {
  id: string;
  name: string;
  color: string;
  status: ProjectStatus;
  deadline: string | null;
  progress: number;
  overdueCount: number;
  deadlineWithin3Days: boolean;
};

export type OversigtFocusTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
};

export type OversigtFocusProjectCard = {
  id: string;
  name: string;
  color: string;
  status: ProjectStatus;
  deadline: string | null;
  progress: number;
  tasks: OversigtFocusTask[];
};
