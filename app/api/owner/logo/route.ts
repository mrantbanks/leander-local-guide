import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { canManage } from '@/lib/owner';
import { putUpload } from '@/lib/r2';
import { uploadUrl } from '@/lib/uploads';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Upload a logo, and have Gemini prepare it for the site.
 *
 * The guide is a newspaper: cream paper, heavy ink, no gloss. A logo dropped in raw is almost always
 * a JPEG with a white box round it, or a photo of a sign, and it looks like a sticker on a broadsheet.
 * So we ask the model to knock the background out and trim it square, and then we show the owner BOTH
 * versions and let them choose.
 *
 * That choice is not politeness, it is the whole safety mechanism. Image models redraw things. A model
 * that "tidies up" somebody's logo has damaged their brand, and they would be right to be furious. We
 * never silently replace a logo with a machine's idea of it: the original is always one click away.
 */
const MAX = 6 * 1024 * 1024;

const CLEAN_PROMPT =
  'This is a business logo. Prepare it for use on a printed newspaper page, and change NOTHING about the design itself. ' +
  'Remove the background completely so it is fully transparent. Trim tightly to the logo with a small even margin, on a square canvas. ' +
  'Keep the exact original colours, lettering, shapes and proportions. Do NOT redraw it, do not restyle it, do not add or remove any element, ' +
  'do not add text, do not add effects or shadows. If the image is a photo of a sign, isolate just the sign artwork. Output a PNG with transparency.';

export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  const slug = String(fd?.get('slug') || '');
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  // Owner or admin. Same check the rest of the owner desk uses, so it can never disagree about who is allowed.
  if (!(await canManage(slug))) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const file = fd?.get('logo');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image file' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'That is not an image' }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: 'That image is over 6MB. Try a smaller one.' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';

  // The untouched original goes up first, whatever happens next. If the model fails, or mangles it,
  // the owner still has their real logo on the site.
  const originalName = `logo-${randomUUID()}.${ext}`;
  await putUpload(originalName, buf, file.type);

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ original: uploadUrl(originalName), originalFile: originalName, cleaned: null });
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ inlineData: { mimeType: file.type, data: buf.toString('base64') } }, { text: CLEAN_PROMPT }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      }
    );
    const j = await r.json();
    const part = (j?.candidates?.[0]?.content?.parts || []).find((p: { inlineData?: { data: string } }) => p.inlineData);
    if (!part) throw new Error(j?.error?.message || 'No image came back');

    const cleanedName = `logo-${randomUUID()}.png`;
    await putUpload(cleanedName, Buffer.from(part.inlineData.data, 'base64'), 'image/png');

    return NextResponse.json({
      original: uploadUrl(originalName), originalFile: originalName,
      cleaned: uploadUrl(cleanedName), cleanedFile: cleanedName,
    });
  } catch (e) {
    // The model is a convenience, not a dependency. They still get their logo.
    return NextResponse.json({
      original: uploadUrl(originalName), originalFile: originalName,
      cleaned: null, note: (e as Error).message,
    });
  }
}
