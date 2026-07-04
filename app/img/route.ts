import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';

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

// Long CDN/browser cache — the bytes for a given (photo, width) never change.
const CACHE_CONTROL = 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800';
function serve(body: Buffer, type: string): Response {
  return new Response(body as unknown as BodyInit, {
    headers: { 'Content-Type': type, 'Cache-Control': CACHE_CONTROL },
  });
}

// Server-side proxy for Google Place Photos: keeps the API key off the client,
// transcodes to WebP for size, and — crucially — caches the bytes in Postgres so
// Google's (billed) Place Photos API is hit at most ONCE per (photo, width). Any
// later request for the same photo+width is served from the DB, never from Google.
export async function GET(req: NextRequest) {
  const n = req.nextUrl.searchParams.get('n') || '';
  const w = req.nextUrl.searchParams.get('w') || '800';
  const key = process.env.GOOGLE_PLACES_KEY;
  // Only allow real Place Photo resource names (anti-SSRF).
  if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(n)) {
    return new Response('bad request', { status: 400 });
  }
  const width = Math.min(parseInt(w, 10) || 800, 1600);

  // 1) Cache hit — serve from Postgres, never touch Google.
  try {
    const { rows } = await pool.query(
      `select content_type, bytes from photo_cache where resource_name=$1 and width=$2`,
      [n, width]);
    if (rows[0]) return serve(rows[0].bytes as Buffer, rows[0].content_type as string);
  } catch { /* cache read failed — fall through to Google */ }

  if (!key) return new Response('bad request', { status: 400 });

  // 2) Cache miss — fetch from Google (billed), transcode, then persist.
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
    // Persist for next time. on-conflict-do-nothing handles the race where two
    // requests miss the same key concurrently.
    try {
      await pool.query(
        `insert into photo_cache (resource_name, width, content_type, bytes)
         values ($1,$2,$3,$4) on conflict (resource_name, width) do nothing`,
        [n, width, type, body]);
    } catch { /* cache write failed — still serve the bytes we have */ }
    return serve(body, type);
  } catch {
    return new Response('fetch failed', { status: 502 });
  }
}
