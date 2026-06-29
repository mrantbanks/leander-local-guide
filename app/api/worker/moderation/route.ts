import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { pool } from '@/lib/db';
import { screenSubmission } from '@/lib/moderate';

export const dynamic = 'force-dynamic';

// Remote-fleet moderation queue (active when AI config task 'moderation' = 'remote').
// GET claims pending reviews/tips; POST records the worker's verdict. The hard guardrail is
// re-applied on approve (defense in depth), so a worker can never publish spam/links/profanity.

function authed(req: NextRequest): boolean {
  const s = req.headers.get('x-worker-secret');
  return !!process.env.WORKER_SECRET && s === process.env.WORKER_SECRET;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const claim = async (tbl: 'reviews' | 'tips', starsCol: string) => (await pool.query(
    `with c as (
        select s.id from ${tbl} s
        where s.status='pending' and (s.worker_checked_at is null or s.worker_checked_at < now() - interval '20 hours')
        order by s.created_at limit 15 for update skip locked
     ), u as (update ${tbl} set worker_checked_at=now() where id in (select id from c) returning *)
     select u.id, u.body, ${starsCol}, r.name venue, r.slug from u join restaurants r on r.id = u.place_id`)).rows;
  const reviews = (await claim('reviews', 'u.stars')).map((x) => ({ kind: 'review', ...x }));
  const tips = (await claim('tips', 'null::int stars')).map((x) => ({ kind: 'tip', ...x }));
  // Tell the worker the house rules so verdicts match the inline AI's behavior.
  return NextResponse.json({
    rubric: 'APPROVE genuine, on-topic reviews/tips about the restaurant (incl. honest negatives), even if details cannot be verified. REJECT spam, ads, links, contact info, hate, gibberish, or clearly off-topic. Use unsure only when you truly cannot tell if it is real.',
    items: [...reviews, ...tips],
  });
}

export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b || !b.id || (b.kind !== 'review' && b.kind !== 'tip') || !b.decision) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  const tbl = b.kind === 'review' ? 'reviews' : 'tips';
  const id = parseInt(String(b.id), 10);
  const note = String(b.reason || '').slice(0, 500);
  let decision = String(b.decision);

  const { rows } = await pool.query(`select s.body, r.slug from ${tbl} s join restaurants r on r.id = s.place_id where s.id = $1`, [id]);
  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (decision === 'approve' && screenSubmission(rows[0].body).hardReject) { decision = 'reject'; } // guardrail wins

  if (decision === 'approve') await pool.query(`update ${tbl} set status='approved', worker_note=$2 where id=$1`, [id, note]);
  else if (decision === 'reject') await pool.query(`update ${tbl} set status='removed', worker_note=$2 where id=$1`, [id, note]);
  else await pool.query(`update ${tbl} set worker_note=$2 where id=$1`, [id, note]);

  if (b.worker_id) {
    const wid = String(b.worker_id).slice(0, 80);
    await pool.query('insert into worker_log (worker_id, event_id, venue, event_type, decision, model, reason) values ($1,null,$2,$3,$4,$5,$6)',
      [wid, String(b.venue || '').slice(0, 120), b.kind, decision, String(b.model || '').slice(0, 80), note]);
    await pool.query('update worker_nodes set last_seen=now() where id=$1', [wid]);
  }
  if (decision === 'approve' && rows[0].slug) revalidatePath(`/r/${rows[0].slug}`);
  revalidatePath('/admin/workers');
  return NextResponse.json({ ok: true, decision });
}
