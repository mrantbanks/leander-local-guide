import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { runJSON } from '@/lib/ai/router';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const PERSONA = "You are Anthony, 'The Leander Local', writing about Leander, Texas food in the voice of Anthony Bourdain: wry, vivid, honest, sharp, a little irreverent, never corporate or fawning, specific about the food and the room, short punchy sentences with the occasional longer riff. No purple prose, no tired cliches ('culinary journey', 'foodie', 'to die for'). HOUSE RULE: never use em dashes or en dashes anywhere; use commas or periods only.";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'No AI engine configured' }, { status: 503 });

  const { slug, notes, visited, verdict, hiddenGem, tags } = await req.json().catch(() => ({}));
  const { rows } = await pool.query('select name, primary_category cat, cuisines, ratings from restaurants where slug = $1', [slug]);
  const r = rows[0];
  if (!r) return NextResponse.json({ error: 'no such spot' }, { status: 404 });

  const ctx = `Restaurant: ${r.name}. Category: ${r.cat}. Cuisines: ${(r.cuisines || []).join(', ') || 'unknown'}. Google rating: ${r.ratings?.google?.rating ?? 'n/a'} from ${r.ratings?.google?.count ?? 0} reviews.`;
  const noted = Array.isArray(tags) && tags.length ? `Things Anthony flagged: ${tags.join(', ')}.` : '';
  let task: string, shape: string;
  if (visited) {
    task = `Anthony VISITED this place. Write his honest FIRST-PERSON review ("I") from his rough notes below. ${verdict ? `His gut verdict: ${verdict}.` : ''} ${hiddenGem ? 'He thinks it is a genuine local hidden gem.' : ''} ${noted}`;
    shape = `{"verdict":"WORTH IT" or "IT'S FINE" or "SKIP IT","hook":"one punchy line, max ~12 words","review":"2 to 3 short paragraphs separated by \\n\\n","whatToOrder":"1 to 2 sentences on the move to order","gotcha":"optional one-line heads up, or empty string"}`;
  } else {
    task = `Anthony has NOT been here yet. Do NOT pretend he has. Write an honest SUMMARY of what reviewers say, third-person ("by most accounts", "reviewers say", "the word going around"), in his voice, grounded in the Google rating and his notes. ${noted}`;
    shape = `{"verdict":"WORTH IT" or "IT'S FINE" or "SKIP IT" (best read from the reviews),"hook":"one punchy line","review":"","summaryNote":"one honest line admitting he hasn't been yet, in his voice","cantWait":"one line about wanting to try it","whatToOrder":"what reviewers rave about, 1 to 2 sentences","gotcha":"optional, or empty string"}`;
  }
  const instruction = `${PERSONA}\n\n${ctx}\n\n${task}\n\nAnthony's rough notes:\n"""${notes || '(no notes, work from the rating and what can fairly be said)'}"""\n\nReturn ONLY minified JSON with exactly these keys: ${shape}. Everything in his voice. No em or en dashes.`;

  try {
    const out = await runJSON('anthony_voice', instruction, { temperature: 0.9 }) as Record<string, unknown>;
    out.visited = !!visited;
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
