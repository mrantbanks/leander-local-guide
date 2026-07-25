import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { eventRequiresTime } from '@/lib/validate';
import { workerAuthed } from '@/lib/secretAuth';

export const dynamic = 'force-dynamic';

// GET: events needing verification — pending ones, plus AI-scraped approved ones
// not re-confirmed in 7 days. Each item carries the venue site so the worker can research.
export async function GET(req: NextRequest) {
  if (!workerAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // Atomically CLAIM up to 15 events (FOR UPDATE SKIP LOCKED) so two workers never
  // grab the same one: lock+stamp worker_checked_at in one statement, then return them.
  const { rows } = await pool.query(`
    with claimed as (
      select e.id from events e
      where (e.status = 'pending'
             or (e.status = 'approved' and e.source = 'ai_scrape'
                 and (e.last_confirmed_at is null or e.last_confirmed_at < now() - interval '7 days')))
        and (e.worker_checked_at is null or e.worker_checked_at < now() - interval '20 hours')
        -- Respect the fleet-worker lease. Without this the legacy worker STEALS rows that
        -- /api/worker/claim has already leased: both verify the same event, both write it, and
        -- last-writer-wins can overturn a fleet 'approve' with a legacy 'reject'. This route is
        -- dead once the legacy worker is retired; until then it must not race the fleet.
        and (e.worker_lease_until is null or e.worker_lease_until < now())
      order by (e.status = 'pending') desc, e.created_at
      limit 15
      for update skip locked
    ), upd as (
      update events set worker_checked_at = now() where id in (select id from claimed) returning *
    )
    select u.id, u.event_type, u.title, u.description, u.freq, u.days_of_week, u.week_of_month,
           to_char(u.start_time,'HH24:MI') as start_time, u.event_date, u.source, u.status,
           u.source_quote, u.source_url,
           r.name as venue, r.slug, r.attributes->>'website' as website, r.address_formatted as address
    from upd u join restaurants r on r.id = u.place_id
    order by (u.status = 'pending') desc, u.created_at`);
  return NextResponse.json({ events: rows });
}

// POST: a worker verdict. { id, decision: 'approve'|'reject'|'unsure', reason, days_of_week?, start_time? }
export async function POST(req: NextRequest) {
  if (!workerAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b || !b.id || !b.decision) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const id = parseInt(String(b.id), 10);
  const note = String(b.reason || '').slice(0, 500);
  const days = Array.isArray(b.days_of_week) ? b.days_of_week.filter((n: number) => n >= 1 && n <= 7) : null;
  const time = typeof b.start_time === 'string' && /^\d{1,2}:\d{2}/.test(b.start_time) ? b.start_time : null;

  // Guardrail: a time-based event (trivia, live music, etc.) can't be approved without a start time.
  let decision = String(b.decision);
  if (decision === 'approve') {
    const ev = await pool.query('select event_type, start_time from events where id = $1', [id]);
    const etype = ev.rows[0]?.event_type || '';
    const resultingTime = time || ev.rows[0]?.start_time || null;
    if (eventRequiresTime(etype) && !resultingTime) decision = 'unsure';
  }

  if (decision === 'approve') {
    await pool.query(
      `update events set status='approved', verified=true, last_confirmed_at=now(),
         expires_at = case when source='ai_scrape' then now()+interval '45 days' else null end,
         days_of_week = coalesce($2, days_of_week), start_time = coalesce($3::time, start_time),
         worker_checked_at=now(), worker_note=$4, updated_at=now()
       where id=$1`, [id, days && days.length ? days : null, time, note]);
  } else if (decision === 'reject') {
    await pool.query(`update events set status='removed', worker_checked_at=now(), worker_note=$2, updated_at=now() where id=$1`, [id, note]);
  } else {
    await pool.query(`update events set worker_checked_at=now(), worker_note=$2 where id=$1`, [id, note]);
  }

  // activity log + worker liveness
  if (b.worker_id) {
    const wid = String(b.worker_id).slice(0, 80);
    await pool.query(
      'insert into worker_log (worker_id, event_id, venue, event_type, decision, model, reason) values ($1,$2,$3,$4,$5,$6,$7)',
      [wid, id, String(b.venue || '').slice(0, 120), String(b.event_type || '').slice(0, 40), decision.slice(0, 20), String(b.model || '').slice(0, 80), note]
    );
    await pool.query('update worker_nodes set last_seen=now() where id=$1', [wid]);
  }
  return NextResponse.json({ ok: true });
}
