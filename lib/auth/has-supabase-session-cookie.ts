import { cookies } from "next/headers";

/** True if Supabase SSR auth cookies are present (session may still be hydrating). */
export async function hasSupabaseSessionCookie(): Promise<boolean> {
  const store = await cookies();
  return store.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.includes("auth-token"),
  );
}
