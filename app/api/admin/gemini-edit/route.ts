import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Admin-only AI image edit via gemini-2.5-flash-image (inpaint / outpaint / enhance / remove, by prompt).
// In: { image: base64 (no prefix), mimeType, prompt }  Out: { image: base64, mimeType }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: 'Gemini not configured' }, { status: 503 });

  const { image, mimeType, prompt } = await req.json().catch(() => ({}));
  if (!image || !prompt) return NextResponse.json({ error: 'Missing image or prompt' }, { status: 400 });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`;
    const body = {
      contents: [{ parts: [{ inlineData: { mimeType: mimeType || 'image/jpeg', data: image } }, { text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    };
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    const parts = j?.candidates?.[0]?.content?.parts || [];
    const out = parts.find((p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData);
    if (!out) return NextResponse.json({ error: j?.error?.message || j?.candidates?.[0]?.finishReason || 'No image returned' }, { status: 502 });
    return NextResponse.json({ image: out.inlineData.data, mimeType: out.inlineData.mimeType || 'image/png' });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
