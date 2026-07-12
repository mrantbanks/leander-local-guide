import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { captionImage } from '@/lib/ai/caption';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

// Admin-only: AI caption for a photo. In: { image: base64, mimeType }  Out: { caption }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'No AI engine configured' }, { status: 503 });
  const { image, mimeType, slug } = await req.json().catch(() => ({}));
  if (!image) return NextResponse.json({ error: 'Missing image' }, { status: 400 });

  // Same voice and same rules as the automatic captioner that runs on upload. The manual button is
  // just a re-roll, so it must not quietly write in a different register.
  try {
    const { rows } = await pool.query(
      'select name, primary_category, cuisines from restaurants where slug = $1',
      [slug || '']
    );
    const r = rows[0];
    const spot = r ? { name: r.name as string, category: r.primary_category as string, cuisines: (r.cuisines || []) as string[] } : null;
    const txt = await captionImage(image, mimeType || 'image/jpeg', spot);
    if (!txt) return NextResponse.json({ error: 'No caption returned' }, { status: 502 });
    return NextResponse.json({ caption: txt });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
