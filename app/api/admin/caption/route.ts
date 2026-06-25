import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

// Admin-only: AI caption for a photo. In: { image: base64, mimeType }  Out: { caption }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: 'Gemini not configured' }, { status: 503 });
  const { image, mimeType } = await req.json().catch(() => ({}));
  if (!image) return NextResponse.json({ error: 'Missing image' }, { status: 400 });

  const instruction = 'Write a short, appetizing caption for this restaurant or food photo, 3 to 7 words. If it is a menu, say what kind of menu. No quotes, no ending period, no emojis, no hashtags. Just the caption text.';
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const body = { contents: [{ parts: [{ inlineData: { mimeType: mimeType || 'image/jpeg', data: image } }, { text: instruction }] }] };
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    const txt = j?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text?.trim();
    if (!txt) return NextResponse.json({ error: j?.error?.message || 'No caption returned' }, { status: 502 });
    return NextResponse.json({ caption: txt.replace(/^["']|["']$/g, '').replace(/[.\s]+$/, '').slice(0, 120) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
