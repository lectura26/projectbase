import type { Prisma } from "@prisma/client";

export function projectAccessWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    AND: [
      { OR: [{ userId: userId }, { members: { some: { userId } } }] },
      { isTemplate: false },
    ],
  };
}
