import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Priority, ProjectVisibility } from "@prisma/client";
import { jsonError, logServerError } from "@/lib/api/safe-response";
import { prisma } from "@/lib/prisma";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { clientIpFromRequest, rateLimitAllow } from "@/lib/rate-limit";

const PRIORITIES = new Set<Priority>(["LOW", "MEDIUM", "HIGH"]);
const VISIBILITIES = new Set<ProjectVisibility>(["ONLY_ME", "TEAM", "ALL"]);

const MAX_NAME_LEN = 500;
const MAX_DESC_LEN = 10_000;
const MAX_TAG_LEN = 64;
const MAX_TAGS = 50;
const MAX_CONTACT_LEN = 320;

const POST_WINDOW_MS = 60_000;
const POST_MAX_PER_WINDOW = 60;

async function supabaseFromCookies() {
  const cookieStore = await cookies();
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
    },
  );
}

export async function GET() {
  try {
    const supabase = await supabaseFromCookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "Unauthorized");
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
  } catch (err) {
    logServerError("GET /api/projects", err);
    return jsonError(500, "An error occurred");
  }
}

type CreateBody = {
  name: string;
  description?: string;
  deadline?: string | null;
  priority: string;
  visibility: string;
  tags?: unknown;
  isRoutine?: boolean;
  contactName?: string;
  contactEmail?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await supabaseFromCookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return jsonError(401, "Unauthorized");
    }

    const ip = clientIpFromRequest(request);
    if (!rateLimitAllow(`api-projects:${ip}:${user.id}`, POST_MAX_PER_WINDOW, POST_WINDOW_MS)) {
      return jsonError(429, "Too many requests");
    }

    let body: CreateBody;
    try {
      body = (await request.json()) as CreateBody;
    } catch {
      return jsonError(400, "Invalid request");
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > MAX_NAME_LEN) {
      return jsonError(400, "Invalid request");
    }

    if (!PRIORITIES.has(body.priority as Priority)) {
      return jsonError(400, "Invalid request");
    }
    if (!VISIBILITIES.has(body.visibility as ProjectVisibility)) {
      return jsonError(400, "Invalid request");
    }

    const description =
      typeof body.description === "string" ? body.description.trim().slice(0, MAX_DESC_LEN) || null : null;

    let deadline: Date | null = null;
    if (body.deadline) {
      const d = new Date(body.deadline);
      if (Number.isNaN(d.getTime())) {
        return jsonError(400, "Invalid request");
      }
      deadline = d;
    }

    let tags: string[] = [];
    if (Array.isArray(body.tags)) {
      tags = body.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().slice(0, MAX_TAG_LEN))
        .filter(Boolean)
        .slice(0, MAX_TAGS);
    }

    const contactName =
      typeof body.contactName === "string" ? body.contactName.trim().slice(0, MAX_CONTACT_LEN) : "";
    const contactEmail =
      typeof body.contactEmail === "string" ? body.contactEmail.trim().slice(0, MAX_CONTACT_LEN) : "";

    await ensureAppUser(user);

    const project = await prisma.project.create({
      data: {
        name,
        userId: user.id,
        description,
        deadline,
        priority: body.priority as Priority,
        visibility: body.visibility as ProjectVisibility,
        tags,
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
  } catch (err) {
    logServerError("POST /api/projects", err);
    return jsonError(500, "An error occurred");
  }
}
