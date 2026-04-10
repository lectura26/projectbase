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
  // Supabase sometimes redirects to Site URL (/) with ?code= instead of /auth/callback.
  // Forward so the route handler can exchange the code and set cookies.
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

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  redirect("/oversigt");
}
