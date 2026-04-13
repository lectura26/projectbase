import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { jsonError, logServerError } from "@/lib/api/safe-response";
import { prisma } from "@/lib/prisma";
import { projectAccessWhere } from "@/lib/projekter/project-access";
import { createSignedStorageUrl } from "@/lib/supabase/storage-signed";

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
  _request: NextRequest,
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

    const file = await prisma.file.findFirst({
      where: { id, project: projectAccessWhere(user.id) },
      select: { storagePath: true },
    });

    if (!file?.storagePath) {
      return jsonError(404, "Not found");
    }

    const signed = await createSignedStorageUrl(file.storagePath, SIGNED_URL_TTL_SEC);
    if ("error" in signed) {
      return jsonError(500, "Could not prepare download");
    }

    return NextResponse.redirect(signed.signedUrl);
  } catch (err) {
    logServerError("GET /api/files/[id]/signed", err);
    return jsonError(500, "An error occurred");
  }
}
