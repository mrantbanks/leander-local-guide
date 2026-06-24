import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Lazy, fail-safe sharp loader: if the native module can't load, we serve the
// original image rather than breaking every card photo on the site.
/* eslint-disable @typescript-eslint/no-explicit-any */
let sharpMod: any = undefined; // undefined = untried, null = unavailable
async function loadSharp(): Promise<any> {
  if (sharpMod === undefined) {
    try { sharpMod = (await import('sharp')).default; } catch { sharpMod = null; }
  }
  return sharpMod;
}

// Server-side proxy for Google Place Photos: keeps the API key off the client,
// transcodes to WebP for size, and is edge-cached by Cloudflare.
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
    const input = Buffer.from(await r.arrayBuffer());
    let body: Buffer = input;
    let type = r.headers.get('content-type') || 'image/jpeg';
    const sh = await loadSharp();
    if (sh) {
      try {
        body = await sh(input).webp({ quality: 78 }).toBuffer();
        type = 'image/webp';
      } catch { /* keep original on transcode failure */ }
    }
    return new Response(body as unknown as BodyInit, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new Response('fetch failed', { status: 502 });
  }
}
