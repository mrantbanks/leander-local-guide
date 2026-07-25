import { NextRequest, NextResponse } from 'next/server';
import { kickoffModeration } from '@/lib/moderateSubmissions';
import { workerAuthed } from '@/lib/secretAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // returns fast; the pass continues in the running server

export async function GET(req: NextRequest) {
  if (!workerAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await kickoffModeration());
}
export async function POST(req: NextRequest) {
  if (!workerAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await kickoffModeration());
}
