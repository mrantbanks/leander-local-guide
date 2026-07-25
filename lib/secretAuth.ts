import { createHash, timingSafeEqual } from 'crypto';

/**
 * Constant-time comparison for the fleet's shared secrets.
 *
 * `a === b` on a secret leaks its length and, in principle, its prefix, because the comparison
 * stops at the first differing byte. Hashing both sides first means timingSafeEqual always gets two
 * equal-length buffers (so it cannot throw on a length mismatch, which would itself be a length
 * oracle) and the compared bytes carry no structure an attacker can walk.
 */
export function secretEq(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

type HeaderBag = { headers: { get(name: string): string | null } };

/**
 * Authenticate a fleet worker / cron request.
 *
 * HEADER ONLY, deliberately. This used to also accept `?s=<secret>`, which put the shared secret
 * into the origin's access log, Cloudflare's log, and any Referer sent from a page the URL was
 * pasted into. The live crontab on web1 already passes these as headers, so nothing depended on
 * the query form.
 */
export function workerAuthed(req: HeaderBag): boolean {
  return secretEq(req.headers.get('x-worker-secret'), process.env.WORKER_SECRET);
}

export function emailTickAuthed(req: HeaderBag): boolean {
  return secretEq(req.headers.get('x-email-secret'), process.env.EMAIL_TICK_SECRET);
}
