import type { Priority, ProjectStatus, TaskStatus } from "@prisma/client";

export type OversigtTaskRow = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  priority: Priority;
  status: TaskStatus;
  deadline: string | null;
};

export type OversigtPulseProject = {
  id: string;
  name: string;
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
