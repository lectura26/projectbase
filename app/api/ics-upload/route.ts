import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseIcsContent } from "@/lib/ics/parse-ics";

const MAX_BYTES = 5 * 1024 * 1024;

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

export async function POST(request: Request) {
  try {
    const supabase = await supabaseFromCookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke logget ind." }, { status: 401 });
    }

    const userId = user.id;
    const formData = await request.formData();
    const file = formData.get("icsFile");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Mangler .ics-fil (felt icsFile)." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Filen må højst være 5 MB." }, { status: 400 });
    }

    const text = await file.text();

    let parsed;
    try {
      parsed = parseIcsContent(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kunne ikke læse ICS-filen.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;

    for (const ev of parsed) {
      const existing = await prisma.icsEvent.findUnique({
        where: {
          userId_externalId: { userId, externalId: ev.externalId },
        },
        select: { id: true },
      });

      await prisma.icsEvent.upsert({
        where: {
          userId_externalId: { userId, externalId: ev.externalId },
        },
        create: {
          userId,
          title: ev.title,
          start: ev.start,
          end: ev.end,
          location: ev.location,
          description: ev.description,
          externalId: ev.externalId,
        },
        update: {
          title: ev.title,
          start: ev.start,
          end: ev.end,
          location: ev.location,
          description: ev.description,
        },
      });

      if (existing) updated += 1;
      else imported += 1;
    }

    const importedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      imported,
      updated,
      importedAt,
    });
  } catch (e) {
    console.error("ics-upload", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Serverfejl." },
      { status: 500 },
    );
  }
}
