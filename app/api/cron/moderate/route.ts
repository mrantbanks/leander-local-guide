import { NextRequest, NextResponse } from 'next/server';
import { kickoffModeration } from '@/lib/moderateSubmissions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // returns fast; the pass continues in the running server

function authed(req: NextRequest): boolean {
  const s = req.headers.get('x-worker-secret') || new URL(req.url).searchParams.get('s');
  return !!process.env.WORKER_SECRET && s === process.env.WORKER_SECRET;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await kickoffModeration());
}
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await kickoffModeration());
}
