import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Priority, ProjectVisibility } from "@prisma/client";
import { jsonError, logServerError } from "@/lib/api/safe-response";
import { prisma } from "@/lib/prisma";
import { ensureAppUser } from "@/lib/auth/ensure-app-user";
import { clientIpFromRequest, rateLimitAllow } from "@/lib/rate-limit";
import { parseOrThrow } from "@/lib/validation/parse";
import { apiProjectCreateSchema } from "@/lib/validation/schemas";

const POST_WINDOW_MS = 60_000;
const POST_MAX_PER_WINDOW = 60;
const GET_WINDOW_MS = 60_000;
const GET_MAX_PER_WINDOW = 120;

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

export async function GET(request: Request) {
  try {
    const supabase = await supabaseFromCookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "Unauthorized");
    }

    const ip = clientIpFromRequest(request);
    if (!rateLimitAllow(`api-projects-get:${ip}:${user.id}`, GET_MAX_PER_WINDOW, GET_WINDOW_MS)) {
      return jsonError(429, "Too many requests");
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
    if (!rateLimitAllow(`api-projects-post:${ip}:${user.id}`, POST_MAX_PER_WINDOW, POST_WINDOW_MS)) {
      return jsonError(429, "Too many requests");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "Invalid request");
    }

    let parsed;
    try {
      parsed = parseOrThrow(apiProjectCreateSchema, body);
    } catch {
      return jsonError(400, "Invalid request");
    }

    const name = parsed.name;
    const description =
      parsed.description === undefined || parsed.description === null
        ? null
        : parsed.description.trim() || null;

    let deadline: Date | null = null;
    if (parsed.deadline) {
      const d = new Date(parsed.deadline);
      if (Number.isNaN(d.getTime())) {
        return jsonError(400, "Invalid request");
      }
      deadline = d;
    }

    const tags = parsed.tags ?? [];

    const contactName =
      typeof parsed.contactName === "string" ? parsed.contactName.trim().slice(0, 320) : "";
    const contactEmail =
      typeof parsed.contactEmail === "string" ? parsed.contactEmail.trim().slice(0, 320) : "";

    await ensureAppUser(user);

    const project = await prisma.project.create({
      data: {
        name,
        userId: user.id,
        description,
        deadline,
        priority: parsed.priority as Priority,
        visibility: parsed.visibility as ProjectVisibility,
        tags,
        isRoutine: Boolean(parsed.isRoutine),
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
