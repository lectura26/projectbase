import { NextResponse } from "next/server";

/** Generic client-safe error (no stack traces or DB details). */
export function jsonError(status: number, message = "An error occurred") {
  return NextResponse.json({ error: message }, { status });
}

export function logServerError(context: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[${context}]`, msg);
}
