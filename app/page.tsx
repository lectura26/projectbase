import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function buildCallbackRedirectQuery(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams)) {
    if (raw === undefined) continue;
    if (Array.isArray(raw)) {
      for (const v of raw) params.append(key, v);
    } else {
      params.set(key, raw);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const code = searchParams.code;
  const codeStr = Array.isArray(code) ? code[0] : code;
  const error = searchParams.error;
  const errorStr = Array.isArray(error) ? error[0] : error;

  if (codeStr) {
    redirect(`/auth/callback${buildCallbackRedirectQuery(searchParams)}`);
  }

  if (errorStr) {
    redirect(`/login${buildCallbackRedirectQuery(searchParams)}`);
  }

  const supabase = await createClient();
  let user: User | null = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Transient or timing issue — fall back to session below.
  }

  if (!user?.id) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    user = session?.user ?? null;
  }

  if (user?.id) {
    redirect("/oversigt");
  }

  redirect("/landing");
}
