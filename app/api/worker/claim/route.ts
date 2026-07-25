import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getProvider } from '@/lib/ai/router';
import { screenSubmission } from '@/lib/moderate';
import { revalidateSpot } from '@/lib/revalidate';
import { workerAuthed } from '@/lib/secretAuth';

export const dynamic = 'force-dynamic';

// fleet-worker claim endpoint (SPEC v1: github.com/mrhits777/fleet-worker).
// Hands out complete work definitions: prompts, output schema, and (for events) the browser
// crawl spec all travel as data. Replaces the worker-side logic in the legacy
// leanderlocalguide-worker repo.
//
// Two job kinds, gated INDEPENDENTLY on capability — an llm-only worker must still get
// moderation work even though it can't do events:
//   - event verification -> task_type 'browser+llm', job id = the bare event id
//   - review/tip moderation -> task_type 'llm',      job id = 'review:<id>' / 'tip:<id>'
// The kinded id is what lets the callback tell them apart: review ids and event ids come from
// different sequences and DO collide, so a bare id would be ambiguous.

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// A SPEC v1 job. `task` is deliberately loose: an event job carries a `browser` block and a
// moderation job doesn't, and they share one queue.
type Job = { id: string; task_type: string; task: Record<string, unknown> };

// Same rubric the in-app Gemini pass used (lib/moderateSubmissions.ts) — moving the prompt into
// the job payload is the whole point of the SPEC: the worker stays project-agnostic.
const MOD_SYSTEM = `You moderate user-submitted content for a local restaurant guide. You are filtering spam and abuse, NOT fact-checking. Be decisive.
APPROVE if it reads like a real person's genuine experience, opinion, or tip about a local food spot, EVEN IF you cannot verify specific details (the menu, the setup, a food truck, a vendor, "the guy on the deck"), and even if it is short, casual, vague, or only refers to the place as "this place" / "here". Approve honest negative reviews too. When in doubt and it looks human and on-topic, APPROVE.
REJECT only if it is clearly spam or an ad, contains links or contact info, is hateful or harassing, is pure gibberish, or is obviously not about food or a restaurant at all.
Use "unsure" RARELY: only when you genuinely cannot tell if it is a planted fake, or cannot tell whether it concerns a food business at all. Do NOT use "unsure" merely because you cannot verify a detail or the venue's exact setup.`;

const SYSTEM = `You verify whether a recurring local event genuinely happens at a specific venue, for a Leander, Texas food & drink guide.
You are given: the event the guide currently has, the venue's website text (rendered), and the original source quote it was extracted from.
Decide if the event is REAL and CURRENT at THIS venue.
Rules:
- A recurring event MUST have a specific day of the week to be approved. If the pages show the day(s) (and time), put them in days_of_week / start_time and approve.
- If you CANNOT find a specific day for a recurring event anywhere in the provided pages, do NOT approve it — reject it as too vague. Never approve a recurring event with no day (e.g. a bare "live music" mention is a reject unless a day is stated).
- reject if the site contradicts it, it's a one-off, or it's not actually at this venue. unsure only if there's a genuine hint but no confirmation.
- Always prefer filling in the real day/time from the site over leaving it blank.`;

export async function POST(req: NextRequest) {
  if (!workerAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const caps: string[] = Array.isArray(b.capabilities) ? b.capabilities : [];
  const limit = Math.min(Math.max(parseInt(String(b.max_jobs || 1), 10) || 1, 1), 5);
  const workerId = String(b.worker_id || 'unknown').slice(0, 80);

  // Event verification renders the venue's site, so it needs Chromium. Moderation doesn't —
  // it's a plain llm job, and gating it on `browser` would starve it on llm-only workers.
  if (!caps.includes('browser')) {
    const modOnly = await claimModeration(caps, limit, workerId);
    return NextResponse.json({ jobs: modOnly });
  }

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

  const jobs: Job[] = rows
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

  // Events are the priority; top up with moderation only if there's room left in this claim,
  // so a browser-capable worker never sits idle while submissions wait.
  if (jobs.length < limit) {
    jobs.push(...(await claimModeration(caps, limit - jobs.length, workerId)));
  }

  return NextResponse.json({ jobs });
}

type ModRow = { id: number; body: string; tip: string | null; stars: number | null; venue: string; slug: string };

// Claim pending reviews/tips as plain `llm` jobs. Only when the admin has routed moderation to
// the fleet (/admin/ai) — otherwise the in-app Gemini pass owns it and handing the same rows to
// a worker would double-moderate them.
async function claimModeration(caps: string[], limit: number, workerId: string): Promise<Job[]> {
  if (limit <= 0 || !caps.includes('llm')) return [];
  if ((await getProvider('moderation')) !== 'remote') return [];

  const claim = async (kind: 'review' | 'tip'): Promise<ModRow[]> => {
    const tbl = kind === 'review' ? 'reviews' : 'tips';
    const extra = kind === 'review' ? 'u.stars, u.tip' : 'null::int as stars, null::text as tip';
    // Same lease contract as events: worker_lease_until is the lease, worker_checked_at is
    // stamped only when a verdict lands. A crashed worker costs 15 min, not the 20h cooldown.
    const { rows } = await pool.query(
      `with c as (
         select s.id from ${tbl} s
         where s.status = 'pending'
           and (s.worker_checked_at is null or s.worker_checked_at < now() - interval '20 hours')
           and (s.worker_lease_until is null or s.worker_lease_until < now())
         order by s.created_at
         limit $1
         for update skip locked
       ), u as (
         update ${tbl} set worker_lease_until = now() + interval '15 minutes'
         where id in (select id from c) returning *
       )
       select u.id, u.body, ${extra}, r.name as venue, r.slug
       from u join restaurants r on r.id = u.place_id`,
      [limit]
    );
    return rows as ModRow[];
  };

  const items = [
    ...(await claim('review')).map((r) => ({ ...r, kind: 'review' as const })),
    ...(await claim('tip')).map((r) => ({ ...r, kind: 'tip' as const })),
  ].slice(0, limit);

  const jobs: Job[] = [];
  for (const it of items) {
    // Hard guardrail runs HERE, before a job is ever created: spam/links/profanity are not a
    // judgement call and must not cost a model call (this is what the in-app pass did too).
    const screen = screenSubmission(it.body);
    if (screen.hardReject) {
      const reason = `guardrail: ${screen.reasons.join(', ')}`;
      const tbl = it.kind === 'review' ? 'reviews' : 'tips';
      await pool.query(
        `update ${tbl} set status='removed', worker_note=$2, worker_checked_at=now(),
           worker_lease_until=null where id=$1`, [it.id, reason]);
      await logModeration(workerId, it.venue, it.kind, 'reject', 'guardrail', reason);
      if (it.slug) revalidateSpot(it.slug);
      continue;
    }

    jobs.push({
      id: `${it.kind}:${it.id}`,
      task_type: 'llm',
      task: {
        system_prompt: MOD_SYSTEM,
        user_prompt: [
          `Decide whether to PUBLISH this ${it.kind} for the restaurant "${it.venue}".`,
          it.kind === 'review' && it.stars ? `The user gave ${it.stars} stars.` : '',
          `SUBMISSION: """${String(it.body || '').slice(0, 1500)}"""`,
          // The practical note ships publicly with the review, so the model should see it.
          it.tip ? `PRACTICAL NOTE (also published): """${String(it.tip).slice(0, 500)}"""` : '',
        ].filter(Boolean).join('\n'),
        output: {
          format: 'json',
          schema: {
            decision: { type: 'string', enum: ['approve', 'reject', 'unsure'], description: 'the verdict' },
            reason: { type: 'string', description: 'one short reason' },
          },
          required: ['decision', 'reason'],
        },
        model: { mode: 'any', timeout_ms: 60000 },
      },
    });
  }
  return jobs;
}

async function logModeration(workerId: string, venue: string, kind: string, decision: string, model: string, reason: string) {
  await pool.query(
    `insert into worker_log (worker_id, event_id, venue, event_type, decision, model, reason)
     values ($1, null, $2, $3, $4, $5, $6)`,
    [workerId.slice(0, 80), String(venue || '').slice(0, 120), kind, decision.slice(0, 20), model.slice(0, 80), reason.slice(0, 500)]
  ).catch(() => {});
}
