/**
 * Rate limiter.
 *
 * - If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, limits are
 *   shared across every serverless instance (recommended on Vercel).
 * - Otherwise it falls back to a per-instance in-memory counter. That still
 *   slows abuse but is NOT reliable on serverless, where instances are
 *   short-lived and independent.
 *
 * Any Upstash failure fails open to the in-memory limiter, so a Redis outage
 * can never lock every student out of the platform.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function memoryLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1 };
  }
  if (existing.count >= limit) return { allowed: false, remaining: 0 };

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count };
}

async function upstashCount(key: string, windowSeconds: number): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["SET", key, "0", "EX", String(windowSeconds), "NX"],
        ["INCR", key],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: unknown }[];
    const count = Number(data?.[1]?.result);
    return Number.isFinite(count) ? count : null;
  } catch {
    return null;
  }
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const shared = await upstashCount(`rl:${key}`, windowSeconds);
  if (shared !== null) {
    return { allowed: shared <= limit, remaining: Math.max(0, limit - shared) };
  }
  return memoryLimit(key, limit, windowSeconds);
}

/** Best-effort client IP. On Vercel, x-forwarded-for is set by the platform. */
export function getClientIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
