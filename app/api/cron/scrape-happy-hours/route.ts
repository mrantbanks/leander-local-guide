import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { scrapeHappyHours } from '@/lib/scrapeHappyHours';
import { workerAuthed } from '@/lib/secretAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // returns fast; the scrape continues in the running server

async function kickoff() {
  // overlap guard: don't start if one is already running
  const running = await pool.query("select id from scraper_runs where kind='happy_hours' and status='running' and started_at > now() - interval '2 hours' limit 1");
  if (running.rows[0]) return { skipped: 'already running', runId: running.rows[0].id };
  const { rows } = await pool.query("insert into scraper_runs(kind, status) values('happy_hours','running') returning id");
  const runId = rows[0].id;
  // fire-and-forget: the standalone Node server keeps executing this after the response is sent
  scrapeHappyHours(runId)
    .then((r) => pool.query("update scraper_runs set finished_at=now(), status='done', checked=$2, found=$3, note=$4 where id=$1", [runId, r.checked, r.found, `${r.found} updated, ${r.skipped} owner-set skipped`]))
    .catch((e) => pool.query("update scraper_runs set finished_at=now(), status='error', note=$2 where id=$1", [runId, String(e).slice(0, 300)]));
  return { started: true, runId };
}

export async function GET(req: NextRequest) {
  if (!workerAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await kickoff());
}
export async function POST(req: NextRequest) {
  if (!workerAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await kickoff());
}
