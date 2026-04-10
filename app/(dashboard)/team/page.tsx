import { redirect } from "next/navigation";
import TeamPageClient from "@/components/team/TeamPageClient";
import { getSessionUser } from "@/lib/auth/session-user";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export type TeamListRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  appRole: AppRole;
  activeProjectCount: number;
  openTaskCount: number;
};

export default async function TeamPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const users = await prisma.user.findMany({
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      appRole: true,
    },
  });

  const rows: TeamListRow[] = await Promise.all(
    users.map(async (u) => {
      const [activeProjectCount, openTaskCount] = await Promise.all([
        prisma.project.count({
          where: {
            status: { not: "COMPLETED" },
            OR: [{ userId: u.id }, { members: { some: { userId: u.id } } }],
          },
        }),
        prisma.task.count({
          where: { userId: u.id, status: { not: "DONE" } },
        }),
      ]);
      return {
        id: u.id,
        name: u.name ?? u.email,
        email: u.email,
        image: u.image,
        appRole: u.appRole,
        activeProjectCount,
        openTaskCount,
      };
    }),
  );

  return <TeamPageClient rows={rows} />;
}
