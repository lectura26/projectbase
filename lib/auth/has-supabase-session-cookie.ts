import { cookies } from "next/headers";

/** True if Supabase SSR auth cookies are present (session may still be hydrating). */
export function hasSupabaseSessionCookie(): boolean {
  return cookies().getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.includes("auth-token"),
  );
}
