import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

function authed(req: NextRequest): boolean {
  const s = req.headers.get('x-worker-secret');
  return !!process.env.WORKER_SECRET && s === process.env.WORKER_SECRET;
}

// GET: events needing verification — pending ones, plus AI-scraped approved ones
// not re-confirmed in 7 days. Each item carries the venue site so the worker can research.
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { rows } = await pool.query(`
    select e.id, e.event_type, e.title, e.description, e.freq, e.days_of_week, e.week_of_month,
           to_char(e.start_time,'HH24:MI') as start_time, e.event_date, e.source, e.status,
           e.source_quote, e.source_url,
           r.name as venue, r.slug, r.attributes->>'website' as website, r.address_formatted as address
    from events e join restaurants r on r.id = e.place_id
    where (e.status = 'pending'
           or (e.status = 'approved' and e.source = 'ai_scrape'
               and (e.last_confirmed_at is null or e.last_confirmed_at < now() - interval '7 days')))
      and (e.worker_checked_at is null or e.worker_checked_at < now() - interval '20 hours')
    order by (e.status = 'pending') desc, e.created_at
    limit 15`);
  return NextResponse.json({ events: rows });
}

// POST: a worker verdict. { id, decision: 'approve'|'reject'|'unsure', reason, days_of_week?, start_time? }
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b || !b.id || !b.decision) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const id = parseInt(String(b.id), 10);
  const note = String(b.reason || '').slice(0, 500);
  const days = Array.isArray(b.days_of_week) ? b.days_of_week.filter((n: number) => n >= 1 && n <= 7) : null;
  const time = typeof b.start_time === 'string' && /^\d{1,2}:\d{2}/.test(b.start_time) ? b.start_time : null;

  if (b.decision === 'approve') {
    await pool.query(
      `update events set status='approved', verified=true, last_confirmed_at=now(),
         expires_at = case when source='ai_scrape' then now()+interval '45 days' else null end,
         days_of_week = coalesce($2, days_of_week), start_time = coalesce($3::time, start_time),
         worker_checked_at=now(), worker_note=$4, updated_at=now()
       where id=$1`, [id, days && days.length ? days : null, time, note]);
  } else if (b.decision === 'reject') {
    await pool.query(`update events set status='removed', worker_checked_at=now(), worker_note=$2, updated_at=now() where id=$1`, [id, note]);
  } else {
    await pool.query(`update events set worker_checked_at=now(), worker_note=$2 where id=$1`, [id, note]);
  }
  return NextResponse.json({ ok: true });
}
