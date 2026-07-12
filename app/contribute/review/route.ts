import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { verifyTurnstile } from '@/lib/turnstile';
import { isVerifiedOwner } from '@/lib/spots';
import { screenSubmission } from '@/lib/moderate';
import { kickoffModeration } from '@/lib/moderateSubmissions';
import { isTrait } from '@/lib/traits';

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

  // The practical note, which used to be a separate "post a tip" form. Free text, so it is screened
  // exactly like the review body.
  const tip = String(fd.get('tip') || '').trim().replace(/[—–]/g, '-').slice(0, 200);
  if (tip) { const scr = screenSubmission(tip); if (scr.hardReject) return NextResponse.json({ error: scr.message || 'We could not accept that' }, { status: 400 }); }

  // Traits are a BOUNDED choice, validated against the vocabulary, so an arbitrary string cannot get
  // in and they need no moderation at all. That is the point of them: they cost Anthony nothing.
  const traits = String(fd.get('traits') || '')
    .split(',').map((t) => t.trim()).filter((t) => t && isTrait(t))
    .slice(0, 12);

  if (await isVerifiedOwner(slug, email)) return NextResponse.json({ error: "You own this spot, you can't review it" }, { status: 400 });

  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return NextResponse.json({ error: 'no such spot' }, { status: 404 });
  await pool.query(
    `insert into reviews (place_id, user_email, stars, body, tip, traits, status)
     values ($1,$2,$3,$4,$5,$6,'pending')
     on conflict (place_id, user_email) do update
       set stars = $3, body = $4, tip = $5, traits = $6, status = 'pending', created_at = now()`,
    [rows[0].id, email, stars, body || null, tip || null, traits]
  );
  void kickoffModeration().catch(() => {}); // moderate it right away, don't wait for the 15-min cron
  return NextResponse.json({ ok: true });
}
