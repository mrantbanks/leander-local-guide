import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

function authed(req: NextRequest): boolean {
  const s = req.headers.get('x-worker-secret');
  return !!process.env.WORKER_SECRET && s === process.env.WORKER_SECRET;
}

// Workers ping this every ~60s so the admin panel can show who's connected.
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => null);
  if (!b || !b.worker_id) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  await pool.query(
    `insert into worker_nodes (id, last_seen, status, processed, errors)
     values ($1, now(), $2, $3, $4)
     on conflict (id) do update set last_seen=now(), status=excluded.status, processed=excluded.processed, errors=excluded.errors`,
    [String(b.worker_id).slice(0, 80), String(b.status || '').slice(0, 40), parseInt(b.processed, 10) || 0, parseInt(b.errors, 10) || 0]
  );
  return NextResponse.json({ ok: true });
}
