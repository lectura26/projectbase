import type { CommentDTO, TaskNoteDTO, TodoItemDTO } from "@/types/project-detail";

export type CalendarMeetingDTO = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  projectId: string | null;
  completed: boolean;
  project: { id: string; name: string; color: string } | null;
};

export type MeetingDetailDTO = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  projectId: string | null;
  completed: boolean;
  project: { id: string; name: string; color: string } | null;
  notes: TaskNoteDTO[];
  comments: CommentDTO[];
  todos: TodoItemDTO[];
};

export type CalendarProjectOption = {
  id: string;
  name: string;
  color: string;
};
