/**
 * Simple in-memory sliding-window rate limiter (per-process).
 * For production at scale, use Redis / Upstash.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 2000;

function prune() {
  const now = Date.now();
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [k, b] of Array.from(buckets.entries())) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

export function rateLimitAllow(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  prune();
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 1, resetAt: now + windowMs };
    buckets.set(key, b);
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

export function clientIpFromRequest(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() ?? "unknown";
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
