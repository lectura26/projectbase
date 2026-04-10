import type { Prisma } from "@prisma/client";

export function projectAccessWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [{ userId: userId }, { members: { some: { userId } } }],
  };
}
