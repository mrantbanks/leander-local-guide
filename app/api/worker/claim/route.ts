import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// fleet-worker claim endpoint (SPEC v1: github.com/mrhits777/fleet-worker).
// Returns event-verification jobs as complete work definitions: prompts, output
// schema, and browser crawl spec all travel as data. Replaces the worker-side
// logic in the legacy leanderlocalguide-worker repo.

function authed(req: NextRequest): boolean {
  const s = req.headers.get('x-worker-secret');
  return !!process.env.WORKER_SECRET && s === process.env.WORKER_SECRET;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SYSTEM = `You verify whether a recurring local event genuinely happens at a specific venue, for a Leander, Texas food & drink guide.
You are given: the event the guide currently has, the venue's website text (rendered), and the original source quote it was extracted from.
Decide if the event is REAL and CURRENT at THIS venue.
Rules:
- A recurring event MUST have a specific day of the week to be approved. If the pages show the day(s) (and time), put them in days_of_week / start_time and approve.
- If you CANNOT find a specific day for a recurring event anywhere in the provided pages, do NOT approve it — reject it as too vague. Never approve a recurring event with no day (e.g. a bare "live music" mention is a reject unless a day is stated).
- reject if the site contradicts it, it's a one-off, or it's not actually at this venue. unsure only if there's a genuine hint but no confirmation.
- Always prefer filling in the real day/time from the site over leaving it blank.`;

export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  // Every leander job needs Chromium — only hand work to browser-capable workers.
  if (!Array.isArray(b.capabilities) || !b.capabilities.includes('browser')) {
    return NextResponse.json({ jobs: [] });
  }
  const limit = Math.min(Math.max(parseInt(String(b.max_jobs || 1), 10) || 1, 1), 5);
  const workerId = String(b.worker_id || 'unknown').slice(0, 80);

  // Atomic claim: 15-min lease via worker_lease_until. worker_checked_at (the 20h
  // re-check cooldown) is stamped by the callback, not here — a crashed worker only
  // costs 15 minutes, not 20 hours.
  const { rows } = await pool.query(
    `with claimed as (
      select e.id from events e
      where (e.status = 'pending'
             or (e.status = 'approved' and e.source = 'ai_scrape'
                 and (e.last_confirmed_at is null or e.last_confirmed_at < now() - interval '7 days')))
        and (e.worker_checked_at is null or e.worker_checked_at < now() - interval '20 hours')
        and (e.worker_lease_until is null or e.worker_lease_until < now())
      order by (e.status = 'pending') desc, e.created_at
      limit $1
      for update skip locked
    ), upd as (
      update events set worker_lease_until = now() + interval '15 minutes'
      where id in (select id from claimed) returning *
    )
    select u.id, u.event_type, u.title, u.freq, u.days_of_week,
           to_char(u.start_time,'HH24:MI') as start_time, u.source, u.source_quote,
           r.name as venue, r.attributes->>'website' as website, r.address_formatted as address
    from upd u join restaurants r on r.id = u.place_id
    order by (u.status = 'pending') desc, u.created_at`,
    [limit]
  );

  // Claims double as worker liveness (SPEC v1 — no separate heartbeat). Upsert so
  // brand-new fleet workers self-register; don't clobber a legacy worker's status.
  await pool.query(
    `insert into worker_nodes (id, last_seen, status) values ($1, now(), 'fleet-worker')
     on conflict (id) do update set last_seen=now()`, [workerId]).catch(() => {});

  const jobs = rows
    .filter((ev) => ev.website)
    .map((ev) => ({
      id: String(ev.id),
      task_type: 'browser+llm',
      task: {
        system_prompt: SYSTEM,
        user_prompt: [
          `EVENT (guide's current record):`,
          `  type: ${ev.event_type}`,
          `  title: ${ev.title}`,
          `  recurrence: ${ev.freq}${ev.days_of_week ? ' days=' + ev.days_of_week.map((d: number) => DAYS[d - 1]).join(',') : ''}${ev.start_time ? ' at ' + ev.start_time : ''}`,
          `  source: ${ev.source}`,
          `  source_quote: ${ev.source_quote || '(none)'}`,
          ``,
          `VENUE: ${ev.venue} — ${ev.address || ''}`,
          `WEBSITE (${ev.website}):`,
          `{{PAGE_TEXT}}`,
        ].join('\n'),
        output: {
          format: 'json',
          schema: {
            decision: { type: 'string', enum: ['approve', 'reject', 'unsure'], description: 'the verdict' },
            days_of_week: { type: 'array', description: 'ISO ints 1=Mon..7=Sun — only if the site clearly states different days' },
            start_time: { type: 'string', description: 'HH:MM 24h — only if the site clearly states a different time' },
            reason: { type: 'string', description: 'one short sentence' },
          },
          required: ['decision', 'reason'],
        },
        model: { mode: 'any', timeout_ms: 60000 },
        browser: {
          url: /^https?:\/\//.test(ev.website) ? ev.website : `https://${ev.website}`,
          subpage_patterns: ['event|calendar|schedule|whats.?on|happening|music|trivia|karaoke|bingo'],
          max_subpages: 3,
          wait_ms: 2000,
          max_chars: 14000,
        },
      },
    }));

  // Events with no website can't be verified by rendering — release them for the
  // 20h cycle without burning a worker job.
  const noSite = rows.filter((ev) => !ev.website).map((ev) => ev.id);
  if (noSite.length) {
    await pool.query(
      `update events set worker_checked_at = now(), worker_lease_until = null,
         worker_note = 'skipped: venue has no website' where id = any($1::int[])`,
      [noSite]
    );
  }

  return NextResponse.json({ jobs });
}
