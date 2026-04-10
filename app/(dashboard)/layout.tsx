import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppToaster } from "@/components/Toaster";
import { AppShell } from "@/components/layout/AppShell";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let userLabel = "";
  if (user?.email) {
    await ensureAppUser(user);
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    });
    userLabel = row?.name ?? row?.email ?? user.email;
  }

  return (
    <AppShell userLabel={userLabel}>
      <AppToaster />
      {children}
    </AppShell>
  );
}
