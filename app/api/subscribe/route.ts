import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyTurnstile } from '@/lib/turnstile';
import { sendEmail } from '@/lib/email/send';
import { confirmEmail } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const source = String(body.source || 'site').slice(0, 60);
  const token = String(body.turnstileToken || body['cf-turnstile-response'] || '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
  const ip = req.headers.get('cf-connecting-ip') || undefined;
  if (!(await verifyTurnstile(token, ip))) return NextResponse.json({ error: 'Verification failed, please try again' }, { status: 400 });

  const { rows } = await pool.query(
    `insert into subscribers (email, source) values ($1,$2)
     on conflict (lower(email)) do update set source = coalesce(subscribers.source, excluded.source)
     returning id, status, confirm_token`,
    [email, source]
  );
  const s = rows[0];
  if (s.status === 'confirmed') return NextResponse.json({ ok: true, state: 'already' });
  if (s.status === 'unsubscribed') await pool.query("update subscribers set status='pending' where id=$1", [s.id]);

  const { subject, html } = confirmEmail(s.confirm_token);
  await sendEmail({ to: email, subject, html, subscriberId: s.id, kind: 'confirm' });
  return NextResponse.json({ ok: true, state: 'check-inbox' });
}
