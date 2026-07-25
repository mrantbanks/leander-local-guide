import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import { stepEmail, STEP_DAYS, STEPS } from '@/lib/email/autoresponder';
import { wrap } from '@/lib/email/templates';
import { emailTickAuthed } from '@/lib/secretAuth';

export const dynamic = 'force-dynamic';

const authed = emailTickAuthed;

export async function POST(req: NextRequest) { return run(req); }
export async function GET(req: NextRequest) { return run(req); }

async function run(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let ar = 0, bc = 0;

  // 1) Autoresponder: every confirmed subscriber whose next step is due.
  const due = await pool.query(
    `select id, email, unsub_token, ar_step from subscribers
     where status='confirmed' and ar_step < $1 and ar_next_due is not null and ar_next_due <= now()
     order by ar_next_due limit 300`,
    [STEPS.length]
  );
  for (const s of due.rows) {
    const { subject, html } = stepEmail(s.ar_step, s.unsub_token);
    await sendEmail({ to: s.email, subject, html, subscriberId: s.id, kind: 'autoresponder', arStep: s.ar_step });
    const next = s.ar_step + 1;
    if (next >= STEPS.length) await pool.query('update subscribers set ar_step=$2, ar_next_due=null where id=$1', [s.id, next]);
    else await pool.query("update subscribers set ar_step=$2, ar_next_due = confirmed_at + (interval '1 day' * $3) where id=$1", [s.id, next, STEP_DAYS[next]]);
    ar++;
  }

  // 2) Scheduled broadcasts whose time has come.
  const camps = await pool.query("select id, subject, body from email_campaigns where kind='broadcast' and status='scheduled' and scheduled_at <= now() order by scheduled_at limit 5");
  for (const c of camps.rows) {
    await pool.query("update email_campaigns set status='sending' where id=$1", [c.id]);
    const subs = await pool.query("select id, email, unsub_token from subscribers where status='confirmed'");
    let n = 0;
    for (const s of subs.rows) {
      const html = wrap(c.body, s.unsub_token);
      await sendEmail({ to: s.email, subject: c.subject, html, subscriberId: s.id, kind: 'broadcast', campaignId: c.id });
      n++;
    }
    await pool.query("update email_campaigns set status='sent', sent_at=now(), recipients=$2 where id=$1", [c.id, n]);
    bc += n;
  }

  return NextResponse.json({ ok: true, autoresponder_sent: ar, broadcast_sent: bc });
}
