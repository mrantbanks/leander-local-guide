import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, ipOf } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

/**
 * Where the browser posts Content-Security-Policy violations.
 *
 * The CSP was enforced on the strength of enumerating every sub-resource the live pages pull. That
 * is good evidence and it is not proof: it cannot see a fetch that only happens after somebody
 * signs in, or a script an edge product starts injecting next month. This endpoint is the
 * difference between finding that out from a log line and finding out from a user.
 *
 * Rate limited hard and per-origin: a violation report is an unauthenticated POST that anyone can
 * forge, and an endpoint that writes a log line per request is a log-flooding primitive. We keep a
 * few per address per hour, which is plenty to notice a real pattern.
 */
export async function POST(req: NextRequest) {
  const ip = ipOf(req);
  if (!rateLimit(`csp-report:${ip}`, 10, 60 * 60 * 1000).ok) {
    return new NextResponse(null, { status: 204 });
  }

  const body = await req.json().catch(() => null);
  // Browsers send either the legacy {"csp-report":{...}} or the Reporting API's [{ body: {...} }].
  const r = body?.['csp-report'] ?? (Array.isArray(body) ? body[0]?.body : null) ?? body;
  if (r && typeof r === 'object') {
    const directive = r['effective-directive'] || r.effectiveDirective || r['violated-directive'] || '?';
    const blocked = String(r['blocked-uri'] || r.blockedURL || '?').slice(0, 200);
    const doc = String(r['document-uri'] || r.documentURL || '?').slice(0, 200);
    // One line, greppable. This is the signal the enforced policy is wrong about something.
    console.warn(`[csp] ${directive} blocked=${blocked} on=${doc}`);
  }
  return new NextResponse(null, { status: 204 });
}
