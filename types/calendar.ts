export type CalendarMeetingDTO = {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  projectId: string | null;
  project: { id: string; name: string; color: string } | null;
};

export type CalendarProjectOption = {
  id: string;
  name: string;
  color: string;
};
