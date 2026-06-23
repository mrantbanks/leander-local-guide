import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
const DIR = '/app/uploads';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9-]+\.(jpe?g|png|webp)$/i.test(name)) return new Response('bad request', { status: 400 });
  try {
    const buf = await readFile(path.join(DIR, name));
    const ext = name.split('.').pop()!.toLowerCase();
    const ct = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return new Response(buf as unknown as BodyInit, {
      headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
