import { prisma } from "@/lib/prisma";
import { PROJECT_COLORS } from "@/lib/projekter/project-colors";

/** First unused palette color for this owner; if all used, cycles by project count. */
export async function nextAssignedColorForUser(userId: string): Promise<string> {
  const rows = await prisma.project.findMany({
    where: { userId, isTemplate: false },
    select: { color: true },
  });
  const used = new Set(rows.map((r) => r.color.toLowerCase()));
  for (const c of PROJECT_COLORS) {
    if (!used.has(c.toLowerCase())) return c;
  }
  return PROJECT_COLORS[rows.length % PROJECT_COLORS.length]!;
}
