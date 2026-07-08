import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { eventRequiresTime } from '@/lib/validate';

export const dynamic = 'force-dynamic';

// fleet-worker callback endpoint (SPEC v1: github.com/mrhits777/fleet-worker).
// Receives verdicts for jobs handed out by /api/worker/claim. Worker output is
// untrusted — the same guardrails as the legacy verdict endpoint apply here.
// Idempotent per job: re-applying the same verdict repeats the same update.

function authed(req: NextRequest): boolean {
  const s = req.headers.get('x-worker-secret');
  return !!process.env.WORKER_SECRET && s === process.env.WORKER_SECRET;
}

export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b || !b.job_id || !b.status) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const id = parseInt(String(b.job_id), 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'bad job_id' }, { status: 400 });

  const ev = await pool.query(
    `select e.event_type, to_char(e.start_time,'HH24:MI') as start_time, r.name as venue
     from events e join restaurants r on r.id = e.place_id where e.id = $1`, [id]);
  if (!ev.rows.length) return NextResponse.json({ error: 'unknown job' }, { status: 404 });
  const etype = ev.rows[0].event_type || '';

  // Execution failed on the worker: release the lease, stamp the attempt so it
  // retries on the normal 20h cadence instead of hot-looping.
  if (b.status === 'failed') {
    const note = `worker failed: ${String(b.error || 'unknown').slice(0, 400)}`;
    await pool.query(
      `update events set worker_checked_at=now(), worker_lease_until=null, worker_note=$2 where id=$1`,
      [id, note]);
    await logVerdict(b, id, ev.rows[0].venue, etype, 'failed', note);
    return NextResponse.json({ ok: true });
  }

  const r = b.result || {};
  const note = String(r.reason || '').slice(0, 500);
  const days = Array.isArray(r.days_of_week)
    ? r.days_of_week.map((n: unknown) => parseInt(String(n), 10)).filter((n: number) => n >= 1 && n <= 7)
    : null;
  const time = typeof r.start_time === 'string' && /^\d{1,2}:\d{2}/.test(r.start_time) ? r.start_time : null;

  let decision = String(r.decision || '');
  if (!['approve', 'reject', 'unsure'].includes(decision)) decision = 'unsure';

  // Guardrail: a time-based event (trivia, live music, etc.) can't be approved without a start time.
  if (decision === 'approve') {
    const resultingTime = time || ev.rows[0].start_time || null;
    if (eventRequiresTime(etype) && !resultingTime) decision = 'unsure';
  }

  if (decision === 'approve') {
    await pool.query(
      `update events set status='approved', verified=true, last_confirmed_at=now(),
         expires_at = case when source='ai_scrape' then now()+interval '45 days' else null end,
         days_of_week = coalesce($2, days_of_week), start_time = coalesce($3::time, start_time),
         worker_checked_at=now(), worker_lease_until=null, worker_note=$4, updated_at=now()
       where id=$1`, [id, days && days.length ? days : null, time, note]);
  } else if (decision === 'reject') {
    await pool.query(
      `update events set status='removed', worker_checked_at=now(), worker_lease_until=null,
         worker_note=$2, updated_at=now() where id=$1`, [id, note]);
  } else {
    await pool.query(
      `update events set worker_checked_at=now(), worker_lease_until=null, worker_note=$2 where id=$1`,
      [id, note]);
  }

  await logVerdict(b, id, ev.rows[0].venue, etype, decision, note);
  return NextResponse.json({ ok: true });
}

async function logVerdict(b: Record<string, unknown>, id: number, venue: string, etype: string, decision: string, note: string) {
  if (!b.worker_id) return;
  const wid = String(b.worker_id).slice(0, 80);
  await pool.query(
    'insert into worker_log (worker_id, event_id, venue, event_type, decision, model, reason) values ($1,$2,$3,$4,$5,$6,$7)',
    [wid, id, String(venue || '').slice(0, 120), String(etype || '').slice(0, 40), decision.slice(0, 20), String(b.model || '').slice(0, 80), note]
  ).catch(() => {});
  await pool.query(
    `insert into worker_nodes (id, last_seen, status) values ($1, now(), 'fleet-worker')
     on conflict (id) do update set last_seen=now()`, [wid]).catch(() => {});
}
