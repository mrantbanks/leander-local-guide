import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { verifyTurnstile } from '@/lib/turnstile';
import { isVerifiedOwner } from '@/lib/spots';
import { screenSubmission } from '@/lib/moderate';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = (session?.user as { email?: string } | undefined)?.email;
  if (!email) return NextResponse.json({ error: 'Sign in to review' }, { status: 401 });

  const fd = await req.formData();
  const ip = req.headers.get('cf-connecting-ip') || undefined;
  if (!(await verifyTurnstile(String(fd.get('turnstileToken') || ''), ip))) return NextResponse.json({ error: 'Verification failed, try again' }, { status: 400 });

  const slug = String(fd.get('slug') || '');
  const stars = parseInt(String(fd.get('stars') || '0'), 10);
  if (!(stars >= 1 && stars <= 5)) return NextResponse.json({ error: 'Pick a star rating' }, { status: 400 });
  const body = String(fd.get('body') || '').trim().replace(/[—–]/g, '-').slice(0, 1200);
  if (body) { const scr = screenSubmission(body); if (scr.hardReject) return NextResponse.json({ error: scr.message || 'We could not accept that' }, { status: 400 }); }

  if (await isVerifiedOwner(slug, email)) return NextResponse.json({ error: "You own this spot, you can't review it" }, { status: 400 });

  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return NextResponse.json({ error: 'no such spot' }, { status: 404 });
  await pool.query(
    `insert into reviews (place_id, user_email, stars, body, status) values ($1,$2,$3,$4,'pending')
     on conflict (place_id, user_email) do update set stars = $3, body = $4, status = 'pending', created_at = now()`,
    [rows[0].id, email, stars, body || null]
  );
  return NextResponse.json({ ok: true });
}
