import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { verifyTurnstile } from '@/lib/turnstile';
import { screenSubmission } from '@/lib/moderate';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = (session?.user as { email?: string } | undefined)?.email;
  if (!email) return NextResponse.json({ error: 'Sign in to leave a tip' }, { status: 401 });

  const fd = await req.formData();
  const ip = req.headers.get('cf-connecting-ip') || undefined;
  const token = String(fd.get('turnstileToken') || '');
  if (!(await verifyTurnstile(token, ip))) return NextResponse.json({ error: 'Verification failed, try again' }, { status: 400 });

  const slug = String(fd.get('slug') || '');
  const body = String(fd.get('body') || '').trim().replace(/[—–]/g, '-').slice(0, 280);
  if (body.length < 4) return NextResponse.json({ error: 'Say a little more' }, { status: 400 });
  const scr = screenSubmission(body);
  if (scr.hardReject) return NextResponse.json({ error: scr.message || 'We could not accept that' }, { status: 400 });

  const cnt = await pool.query("select count(*)::int n from tips where user_email = $1 and created_at > now() - interval '1 day'", [email]);
  if (cnt.rows[0].n >= 20) return NextResponse.json({ error: "You've hit today's tip limit, try again tomorrow" }, { status: 429 });
  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return NextResponse.json({ error: 'no such spot' }, { status: 404 });
  await pool.query(
    "insert into tips (place_id, body, user_email, status, ip_hash) values ($1,$2,$3,'pending',$4)",
    [rows[0].id, body, email, ip || null]
  );
  return NextResponse.json({ ok: true });
}
