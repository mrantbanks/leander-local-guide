import { headers } from 'next/headers';

/**
 * A small in-process rate limiter.
 *
 * The guide runs as ONE Node container on web1, so a Map in memory is a real limit and not a
 * decoration. If this ever runs more than one replica, this has to move to Postgres or Redis,
 * because each replica would then get its own allowance. That is a deliberate trade: a DB round
 * trip on every anonymous tap is worse than the thing it is protecting against, today.
 *
 * Fixed window, not a token bucket: the failure mode of a fixed window is that someone can spend
 * two windows' worth of budget across a boundary, which for "don't run up a Google bill" and
 * "don't stuff the ballot" is not worth the extra machinery.
 */
type Hit = { count: number; resetAt: number };
const BUCKETS = new Map<string, Hit>();

// Bound the map. Anything already expired is dead weight; sweep it when we cross the mark rather
// than on a timer, so an idle server does no work.
const MAX_KEYS = 20_000;
function sweep(now: number) {
  for (const [k, h] of BUCKETS) if (h.resetAt <= now) BUCKETS.delete(k);
}

export type RateResult = { ok: boolean; remaining: number; retryAfter: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  if (BUCKETS.size > MAX_KEYS) sweep(now);
  const cur = BUCKETS.get(key);
  if (!cur || cur.resetAt <= now) {
    BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  cur.count++;
  if (cur.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((cur.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - cur.count, retryAfter: 0 };
}

/** Test seam. Never called in app code. */
export function __resetRateLimits() {
  BUCKETS.clear();
}

/**
 * The caller's IP, as far as we can honestly tell.
 *
 * Cloudflare sits in front of the site, so cf-connecting-ip is the trustworthy one. x-forwarded-for
 * is client-settable when a request reaches the origin directly, so it is a FALLBACK and we take
 * the first hop only. Anyone bypassing Cloudflare can forge this; the limiter is a cost control and
 * an abuse speed bump, not an authentication boundary, and it is documented as such.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function ipOf(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
