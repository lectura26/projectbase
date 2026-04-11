import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { logServerError } from "@/lib/api/safe-response";
import { clientIpFromRequest, rateLimitAllow } from "@/lib/rate-limit";

const AUTH_CALLBACK_WINDOW_MS = 60_000;
const AUTH_CALLBACK_MAX = 40;

/**
 * OAuth callback: exchange `code` for a session and attach Set-Cookie on the redirect response.
 * Writing cookies via `response.cookies` ensures the browser receives them before navigating to /oversigt.
 */
export async function GET(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  if (!rateLimitAllow(`auth-callback:${ip}`, AUTH_CALLBACK_MAX, AUTH_CALLBACK_WINDOW_MS)) {
    const { origin } = new URL(request.url);
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code || code.length > 4096) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }

    const cookieStore = cookies();
    const redirectTo = `${origin}/oversigt`;
    const response = NextResponse.redirect(redirectTo);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }

    return response;
  } catch (err) {
    logServerError("GET /auth/callback", err);
    const { origin } = new URL(request.url);
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }
}
