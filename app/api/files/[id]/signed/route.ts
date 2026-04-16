import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { jsonError, logServerError } from "@/lib/api/safe-response";
import { prisma } from "@/lib/prisma";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import { clientIpFromRequest, rateLimitAllow } from "@/lib/rate-limit";
import { createSignedStorageUrl } from "@/lib/supabase/storage-signed";

const SIGNED_GET_WINDOW_MS = 60_000;
const SIGNED_GET_MAX = 60;

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

const SIGNED_URL_TTL_SEC = 600;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await supabaseFromCookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(401, "Unauthorized");
    }

    const ip = clientIpFromRequest(request);
    if (!rateLimitAllow(`api-file-signed:${ip}:${user.id}`, SIGNED_GET_MAX, SIGNED_GET_WINDOW_MS)) {
      return jsonError(429, "Too many requests");
    }

    const file = await prisma.file.findFirst({
      where: { id, project: projectAccessWhere(user.id) },
      select: { storagePath: true },
    });

    if (!file?.storagePath) {
      return jsonError(404, "Not found");
    }

    const signed = await createSignedStorageUrl(file.storagePath, SIGNED_URL_TTL_SEC);
    if ("error" in signed) {
      console.error("GET /api/files/[id]/signed createSignedStorageUrl:", signed.error);
      return jsonError(500, signed.error);
    }

    return NextResponse.redirect(signed.signedUrl);
  } catch (err) {
    logServerError("GET /api/files/[id]/signed", err);
    return jsonError(500, "An error occurred");
  }
}
