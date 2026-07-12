import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { UPLOAD_DIR } from '@/lib/r2';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
let sharpMod: any = undefined;
async function loadSharp(): Promise<any> {
  if (sharpMod === undefined) { try { sharpMod = (await import('sharp')).default; } catch { sharpMod = null; } }
  return sharpMod;
}

// Serve a locally-stored upload, optionally resized to ?w= via sharp (-> WebP). CF-cacheable.
export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // The optional `logo-` prefix is load-bearing. Owner logos are stored as `logo-<uuid>.png` so that
  // saveOwnerLogo can tell a logo from any other file in the bucket and refuse to point a listing at
  // someone else's photo. The old pattern was hex-only, so `l`, `o` and `g` failed it and EVERY logo
  // 404'd at 400 before it ever reached the disk. Keep the prefix in both places or neither.
  if (!/^(logo-)?[a-f0-9-]+\.(jpe?g|png|webp)$/i.test(name)) return new Response('bad request', { status: 400 });
  const w = parseInt(req.nextUrl.searchParams.get('w') || '0', 10);
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, name));
    const ext = name.split('.').pop()!.toLowerCase();
    let body: Buffer = buf;
    let type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    if (w > 0) {
      const sh = await loadSharp();
      if (sh) { try { body = await sh(buf).resize({ width: Math.min(w, 2000), withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(); type = 'image/webp'; } catch { /* keep original */ } }
    }
    return new Response(body as unknown as BodyInit, {
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
