import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import { stepEmail, STEP_DAYS } from '@/lib/email/autoresponder';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') || '';
  // Confirm + reset to the start of the drip. Day 0 fires immediately below.
  const { rows } = await pool.query(
    "update subscribers set status='confirmed', confirmed_at=now(), ar_step=1, ar_next_due = now() + (interval '1 day' * $2) where confirm_token=$1 and status<>'unsubscribed' returning id, email, unsub_token",
    [t, STEP_DAYS[1]]
  );
  const url = new URL('/subscribe/thanks', req.url);
  if (!rows[0]) { url.searchParams.set('e', '1'); return NextResponse.redirect(url); }

  const { subject, html } = stepEmail(0, rows[0].unsub_token);
  await sendEmail({ to: rows[0].email, subject, html, subscriberId: rows[0].id, kind: 'autoresponder', arStep: 0 });

  const res = NextResponse.redirect(url);
  res.cookies.set('llg_sub', 'confirmed', { maxAge: 31536000, path: '/' });
  return res;
}
