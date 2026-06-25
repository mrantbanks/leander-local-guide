import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { moderateSubmissions } from '@/lib/moderateSubmissions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // returns fast; the pass continues in the running server

function authed(req: NextRequest): boolean {
  const s = req.headers.get('x-worker-secret') || new URL(req.url).searchParams.get('s');
  return !!process.env.WORKER_SECRET && s === process.env.WORKER_SECRET;
}

async function kickoff() {
  // nothing pending? do nothing (keeps the panel honest, avoids empty runs)
  const pend = await pool.query("select (select count(*) from reviews where status='pending') + (select count(*) from tips where status='pending') n");
  if (Number(pend.rows[0].n) === 0) return { idle: true };
  const running = await pool.query("select id from scraper_runs where kind='moderation' and status='running' and started_at > now() - interval '30 minutes' limit 1");
  if (running.rows[0]) return { skipped: 'already running', runId: running.rows[0].id };
  const { rows } = await pool.query("insert into scraper_runs(kind, status) values('moderation','running') returning id");
  const runId = rows[0].id;
  moderateSubmissions(runId)
    .then((r) => pool.query("update scraper_runs set finished_at=now(), status='done', checked=$2, found=$3, note=$4 where id=$1", [runId, r.checked, r.approved, `${r.approved} approved, ${r.rejected} rejected, ${r.unsure} left for human`]))
    .catch((e) => pool.query("update scraper_runs set finished_at=now(), status='error', note=$2 where id=$1", [runId, String(e).slice(0, 300)]));
  return { started: true, runId };
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await kickoff());
}
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await kickoff());
}
