import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { verifyTurnstile } from '@/lib/turnstile';
import { isVerifiedOwner } from '@/lib/spots';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = (session?.user as { email?: string } | undefined)?.email;
  if (!email) return NextResponse.json({ error: 'Sign in' }, { status: 401 });

  const fd = await req.formData();
  const slug = String(fd.get('slug') || '');
  if (!(await isVerifiedOwner(slug, email))) return NextResponse.json({ error: 'Not a verified owner of this spot' }, { status: 403 });
  const ip = req.headers.get('cf-connecting-ip') || undefined;
  if (!(await verifyTurnstile(String(fd.get('turnstileToken') || ''), ip))) return NextResponse.json({ error: 'Verification failed' }, { status: 400 });

  const body = String(fd.get('body') || '').trim().replace(/[—–]/g, '-').slice(0, 1000);
  if (body.length < 4) return NextResponse.json({ error: 'Say a little more' }, { status: 400 });
  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return NextResponse.json({ error: 'no such spot' }, { status: 404 });
  await pool.query('insert into owner_responses (place_id, owner_email, body) values ($1,$2,$3)', [rows[0].id, email, body]);
  return NextResponse.json({ ok: true });
}
