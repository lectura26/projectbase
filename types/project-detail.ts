import type {
  ActivityType,
  Priority,
  ProjectStatus,
  ProjectVisibility,
  RoutineInterval,
  TaskStatus,
} from "@prisma/client";

export type UserMini = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export type CommentDTO = {
  id: string;
  content: string;
  createdAt: string;
  author: UserMini;
};

export type TaskDetailDTO = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  deadline: string | null;
  assignee: UserMini | null;
  comments: CommentDTO[];
};

export type ActivityDTO = {
  id: string;
  type: ActivityType;
  title: string;
  source: string;
  organizerName: string | null;
  date: string;
  autoMatched: boolean;
  confirmed: boolean;
};

export type FileDTO = {
  id: string;
  name: string;
  fileType: string;
  url: string;
  storagePath: string | null;
  createdAt: string;
  uploadedBy: UserMini;
};

export type CalendarEventDTO = {
  id: string;
  title: string;
  date: string;
  eventTime: string | null;
};

export type ProjectDetailPayload = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority;
  visibility: ProjectVisibility;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  isRoutine: boolean;
  routineInterval: RoutineInterval | null;
  tags: string[];
  calendarColor: string;
  userId: string;
  owner: UserMini;
  members: { user: UserMini }[];
  contacts: { id: string; name: string; email: string }[];
  tasks: TaskDetailDTO[];
  projectComments: CommentDTO[];
  activities: ActivityDTO[];
  files: FileDTO[];
  calendarEvents: CalendarEventDTO[];
};
