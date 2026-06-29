import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runJSON } from '@/lib/ai/router';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

// Admin-only: AI caption for a photo. In: { image: base64, mimeType }  Out: { caption }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'No AI engine configured' }, { status: 503 });
  const { image, mimeType } = await req.json().catch(() => ({}));
  if (!image) return NextResponse.json({ error: 'Missing image' }, { status: 400 });

  const instruction = 'Write a short, appetizing caption for this restaurant or food photo, 3 to 7 words. If it is a menu, say what kind of menu. No quotes, no ending period, no emojis, no hashtags. Return ONLY minified JSON: {"caption":"<the caption>"}';
  try {
    const out = await runJSON('captions', instruction, { image: { mimeType: mimeType || 'image/jpeg', data: image } }) as { caption?: string };
    const txt = (out?.caption || '').trim();
    if (!txt) return NextResponse.json({ error: 'No caption returned' }, { status: 502 });
    return NextResponse.json({ caption: txt.replace(/^["']|["']$/g, '').replace(/[.\s]+$/, '').slice(0, 120) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
