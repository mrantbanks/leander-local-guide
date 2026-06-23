import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Server-side proxy for Google Place Photos — keeps the API key off the client,
// caches for performance, and lets us swap to self-hosted images later transparently.
export async function GET(req: NextRequest) {
  const n = req.nextUrl.searchParams.get('n') || '';
  const w = req.nextUrl.searchParams.get('w') || '800';
  const key = process.env.GOOGLE_PLACES_KEY;
  // Only allow real Place Photo resource names (anti-SSRF).
  if (!key || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(n)) {
    return new Response('bad request', { status: 400 });
  }
  const width = Math.min(parseInt(w, 10) || 800, 1600);
  const upstream = `https://places.googleapis.com/v1/${n}/media?maxWidthPx=${width}&key=${key}`;
  try {
    const r = await fetch(upstream, { cache: 'no-store' });
    if (!r.ok) return new Response('upstream error', { status: 502 });
    const buf = await r.arrayBuffer();
    return new Response(buf, {
      headers: {
        'Content-Type': r.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new Response('fetch failed', { status: 502 });
  }
}
