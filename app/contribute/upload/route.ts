import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { auth } from '@/auth';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
const DIR = '/app/uploads';

async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret || !token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const d = await r.json();
    return !!d.success;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = (session?.user as { email?: string } | undefined)?.email;
  if (!email) return NextResponse.json({ error: 'Sign in to add photos' }, { status: 401 });

  const fd = await req.formData();
  const token = String(fd.get('turnstileToken') || fd.get('cf-turnstile-response') || '');
  const ip = req.headers.get('cf-connecting-ip') || undefined;
  if (!(await verifyTurnstile(token, ip))) return NextResponse.json({ error: 'Verification failed, please try again' }, { status: 400 });
  if (fd.get('rights') !== 'true') return NextResponse.json({ error: 'Rights acknowledgment required' }, { status: 400 });

  const slug = String(fd.get('slug') || '');
  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return NextResponse.json({ error: 'no such spot' }, { status: 404 });
  const placeId = rows[0].id;

  await mkdir(DIR, { recursive: true });
  const files = fd.getAll('photos').filter((f): f is File => f instanceof File);
  let saved = 0;
  for (const file of files.slice(0, 6)) {
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) continue;
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const fn = `${randomUUID()}.${ext}`;
    await writeFile(path.join(DIR, fn), Buffer.from(await file.arrayBuffer()));
    await pool.query(
      "insert into photos (place_id, filename, source, status, uploaded_by, rights_ack, rights_ack_at) values ($1,$2,'user','pending',$3,true,now())",
      [placeId, fn, email]
    );
    saved++;
  }
  return NextResponse.json({ saved });
}
