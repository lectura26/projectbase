import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Priority, ProjectVisibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";

function supabaseFromCookies() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function GET() {
  const supabase = supabaseFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId: user.id, isTemplate: false },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      contacts: { select: { id: true, name: true } },
      tasks: { select: { status: true } },
    },
  });

  return NextResponse.json(projects);
}

type CreateBody = {
  name: string;
  description?: string;
  deadline?: string | null;
  priority: Priority;
  visibility: ProjectVisibility;
  tags?: string[];
  isRoutine?: boolean;
  contactName?: string;
  contactEmail?: string;
};

export async function POST(request: Request) {
  const supabase = supabaseFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureAppUser(user);

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Navn er påkrævet" }, { status: 400 });
  }

  const description = typeof body.description === "string" ? body.description.trim() || null : null;
  const contactName = typeof body.contactName === "string" ? body.contactName.trim() : "";
  const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";

  const project = await prisma.project.create({
    data: {
      name,
      userId: user.id,
      description,
      deadline: body.deadline ? new Date(body.deadline) : null,
      priority: body.priority,
      visibility: body.visibility,
      tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [],
      isRoutine: Boolean(body.isRoutine),
      ...(contactName && contactEmail
        ? {
            contacts: {
              create: [{ name: contactName, email: contactEmail }],
            },
          }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      contacts: true,
      tasks: true,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
