import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CSRF defense for cookie-authenticated API routes: require same-origin `Origin`
 * when the browser sends it (POST/PUT/PATCH/DELETE).
 */
export function middleware(request: NextRequest) {
  const method = request.method;
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  if (!path.startsWith("/api/")) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return NextResponse.next();
  }

  const host = request.headers.get("host");
  if (!host) {
    return NextResponse.next();
  }

  try {
    const o = new URL(origin);
    if (o.host !== host) {
      return new NextResponse(null, { status: 403 });
    }
  } catch {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
