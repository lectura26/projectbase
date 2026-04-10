import type { NotificationType } from "@prisma/client";

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  relatedProjectId: string | null;
  relatedTaskId: string | null;
  createdAt: string;
};
