import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session-user";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getSessionUser();
  if (!user) {
    return { title: "Projekt" };
  }
  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: user.id },
    select: { name: true },
  });
  return { title: project?.name ?? "Projekt" };
}

export default async function ProjectDetailPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = params;
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    select: { id: true, name: true },
  });

  if (!project) notFound();

  return (
    <div className="rounded-xl border border-app-topbar-border bg-surface-container-lowest p-8">
      <h1 className="font-headline text-xl font-bold text-app-sidebar">{project.name}</h1>
      <p className="mt-2 font-body text-sm text-on-surface-variant/80">
        Projektside kommer senere.
      </p>
      <Link
        href="/projekter"
        className="mt-6 inline-block font-body text-sm font-medium text-app-sidebar underline-offset-2 hover:underline"
      >
        ← Tilbage til projekter
      </Link>
    </div>
  );
}
