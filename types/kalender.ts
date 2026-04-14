export type KalenderProject = {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
};

export type KalenderEvent = {
  id: string;
  title: string;
  date: string;
  eventTime: string | null;
  projectId: string;
  projectName: string;
};

export type KalenderTaskDeadline = {
  id: string;
  title: string;
  deadline: string;
  projectId: string;
  projectName: string;
  assigneeId: string | null;
};

export type KalenderUserOption = {
  id: string;
  name: string;
  email: string;
};

export type KalenderIcsEvent = {
  id: string;
  title: string;
  start: string;
  end: string | null;
  location: string | null;
  description: string | null;
  projectId: string | null;
  project: { id: string; name: string; color: string } | null;
};
