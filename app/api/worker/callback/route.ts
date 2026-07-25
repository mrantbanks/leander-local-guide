import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { eventRequiresTime } from '@/lib/validate';
import { screenSubmission } from '@/lib/moderate';
import { revalidateSpot } from '@/lib/revalidate';
import { workerAuthed } from '@/lib/secretAuth';

export const dynamic = 'force-dynamic';

// fleet-worker callback endpoint (SPEC v1: github.com/mrhits777/fleet-worker).
// Receives verdicts for jobs handed out by /api/worker/claim. Worker output is
// untrusted — the same guardrails as the legacy verdict endpoint apply here.
// Idempotent per job: re-applying the same verdict repeats the same update.

export async function POST(req: NextRequest) {
  if (!workerAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b || !b.job_id || !b.status) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  // Moderation jobs carry a kinded id ('review:123' / 'tip:456') because review ids and event
  // ids come from different sequences and collide. Must be checked BEFORE parseInt — note
  // parseInt('123:review') would happily return 123, which is why the kind comes first.
  const mod = /^(review|tip):(\d+)$/.exec(String(b.job_id));
  if (mod) return handleModeration(b, mod[1] as 'review' | 'tip', parseInt(mod[2], 10));

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

// Review/tip moderation verdict. Worker output is untrusted, so every guardrail the in-app
// Gemini pass applied is re-applied here against the body re-read from the DB — never against
// anything the worker sent back.
async function handleModeration(b: Record<string, unknown>, kind: 'review' | 'tip', id: number) {
  const tbl = kind === 'review' ? 'reviews' : 'tips';
  const { rows } = await pool.query(
    `select s.body, r.name as venue, r.slug from ${tbl} s join restaurants r on r.id = s.place_id where s.id = $1`,
    [id]);
  if (!rows.length) return NextResponse.json({ error: 'unknown job' }, { status: 404 });
  const { body, venue, slug } = rows[0];

  // Worker failed to execute: release the lease and stamp the attempt so it retries on the
  // normal 20h cadence instead of hot-looping. The submission stays pending for a human.
  if (b.status === 'failed') {
    const note = `worker failed: ${String(b.error || 'unknown').slice(0, 400)}`;
    await pool.query(
      `update ${tbl} set worker_checked_at=now(), worker_lease_until=null, worker_note=$2 where id=$1`,
      [id, note]);
    await logModerationVerdict(b, venue, kind, 'failed', note);
    return NextResponse.json({ ok: true });
  }

  const r = (b.result || {}) as Record<string, unknown>;
  let decision = String(r.decision || '');
  if (!['approve', 'reject', 'unsure'].includes(decision)) decision = 'unsure';
  let note = String(r.reason || '').slice(0, 500);

  // Guardrails, in the same order the in-app pass used:
  //  1. hard reject (links/email/phone/profanity/spam) ALWAYS wins over an approve;
  //  2. a soft-flagged submission (too short/long/all-caps) is never auto-published — it is
  //     downgraded to unsure for a human. The old /api/worker/moderation route dropped this
  //     second rule, so a soft-flagged item the model approved got published.
  if (decision === 'approve') {
    const screen = screenSubmission(body);
    if (screen.hardReject) {
      decision = 'reject';
      note = `guardrail: ${screen.reasons.join(', ')}`;
    } else if (screen.reasons.length) {
      decision = 'unsure';
      note = `soft flag: ${screen.reasons.join(', ')}`;
    }
  }

  if (decision === 'approve') {
    await pool.query(
      `update ${tbl} set status='approved', worker_note=$2, worker_checked_at=now(), worker_lease_until=null where id=$1`,
      [id, note]);
  } else if (decision === 'reject') {
    await pool.query(
      `update ${tbl} set status='removed', worker_note=$2, worker_checked_at=now(), worker_lease_until=null where id=$1`,
      [id, note]);
  } else {
    await pool.query(
      `update ${tbl} set worker_note=$2, worker_checked_at=now(), worker_lease_until=null where id=$1`,
      [id, note]);
  }

  await logModerationVerdict(b, venue, kind, decision, note);
  // An approved review changes the page's aggregateRating, so bust every cached surface.
  if ((decision === 'approve' || decision === 'reject') && slug) revalidateSpot(slug);
  return NextResponse.json({ ok: true, decision });
}

async function logModerationVerdict(b: Record<string, unknown>, venue: string, kind: string, decision: string, note: string) {
  if (!b.worker_id) return;
  const wid = String(b.worker_id).slice(0, 80);
  await pool.query(
    `insert into worker_log (worker_id, event_id, venue, event_type, decision, model, reason)
     values ($1, null, $2, $3, $4, $5, $6)`,
    [wid, String(venue || '').slice(0, 120), kind, decision.slice(0, 20), String(b.model || '').slice(0, 80), note]
  ).catch(() => {});
  await pool.query(
    `insert into worker_nodes (id, last_seen, status) values ($1, now(), 'fleet-worker')
     on conflict (id) do update set last_seen=now()`, [wid]).catch(() => {});
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
