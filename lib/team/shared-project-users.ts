import { prisma } from "@/lib/prisma";

/**
 * Projects the user can access (owner or member), excluding templates.
 */
function accessibleProjectsWhere(userId: string) {
  return {
    isTemplate: false,
    OR: [{ userId }, { members: { some: { userId } } }],
  };
}

/**
 * All distinct user IDs (owners + members) on any project the user can access.
 */
export async function getUserIdsOnSharedProjectsWith(
  currentUserId: string,
): Promise<string[]> {
  const projects = await prisma.project.findMany({
    where: accessibleProjectsWhere(currentUserId),
    select: {
      userId: true,
      members: { select: { userId: true } },
    },
  });
  const ids = new Set<string>();
  for (const p of projects) {
    ids.add(p.userId);
    for (const m of p.members) ids.add(m.userId);
  }
  return Array.from(ids);
}

/** Other users on those projects (excludes current user). */
export async function getPeerUserIdsSharingProjects(
  currentUserId: string,
): Promise<string[]> {
  const ids = await getUserIdsOnSharedProjectsWith(currentUserId);
  return ids.filter((id) => id !== currentUserId);
}

/**
 * Project IDs where both users are owner or member (non-template).
 */
export async function getSharedProjectIdsForUserPair(
  userA: string,
  userB: string,
): Promise<string[]> {
  const projects = await prisma.project.findMany({
    where: {
      isTemplate: false,
      AND: [
        {
          OR: [{ userId: userA }, { members: { some: { userId: userA } } }],
        },
        {
          OR: [{ userId: userB }, { members: { some: { userId: userB } } }],
        },
      ],
    },
    select: { id: true },
  });
  return projects.map((p) => p.id);
}
