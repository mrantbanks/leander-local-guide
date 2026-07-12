import { pool } from '@/lib/db';
import { runJSON } from '@/lib/ai/router';
import { PERSONA, houseStyle } from '@/lib/ai/persona';
import { revalidateSpot } from '@/lib/revalidate';

/**
 * Caption a photo the moment it is uploaded, in Anthony's voice.
 *
 * Fire and forget, deliberately: a caption is worth a few seconds of a model's time but not a few
 * seconds of the uploader's. The photo row is already written and already visible; the caption lands
 * a moment later and busts the spot's cache so the page picks it up.
 *
 * We caption user-submitted photos too, even though they sit in the moderation queue. A captioned
 * photo is faster to moderate, and the caption is the guide's own words either way.
 */

const MAX = 90; // it renders under the photo, not as a paragraph

function instructionFor(spot: { name: string; category: string; cuisines: string[] } | null): string {
  const ctx = spot
    ? `The photo was taken at ${spot.name}, a ${spot.category.toLowerCase()} in Leander, Texas${
        spot.cuisines.length ? ` serving ${spot.cuisines.join(', ')}` : ''
      }.`
    : 'The photo was taken at a restaurant in Leander, Texas.';

  return (
    `${PERSONA}\n\n${ctx}\n\n` +
    'Write ONE caption for this photo, to sit underneath it on the restaurant page. ' +
    'Six to twelve words. Say what is actually IN the picture, concretely: the dish, the room, the ' +
    'sign, the line out the door. Never invent a detail you cannot see. If it is a photograph of a ' +
    'menu, say so plainly. If it is a plate of food, name the food. If you genuinely cannot tell what ' +
    'it is, describe what you can see and nothing more. No hashtags, no emojis, no quotes, no final ' +
    'period, no em dashes.\n\n' +
    'Return ONLY minified JSON: {"caption":"<the caption>"}'
  );
}

/** The model's answer, cleaned. Exported so the admin's manual "AI caption" button uses the same voice. */
export async function captionImage(
  data: string,
  mimeType: string,
  spot: { name: string; category: string; cuisines: string[] } | null
): Promise<string | null> {
  const out = (await runJSON('captions', instructionFor(spot), { image: { mimeType, data } })) as { caption?: string };
  const txt = houseStyle(out?.caption || '');
  return txt ? txt.slice(0, MAX) : null;
}

/**
 * Caption a freshly-uploaded photo and store it. Never overwrites a caption a human already wrote.
 *
 * Failures are LOGGED, not swallowed. The house habit of `.catch(() => {})` is exactly how a silent
 * bug once dropped 100% of Passport stamp pulls while still returning HTTP 200.
 */
export async function autoCaption(photoId: number, placeId: string, buf: Buffer, mimeType: string): Promise<void> {
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) return;

  try {
    const { rows } = await pool.query(
      'select slug, name, primary_category, cuisines from restaurants where id = $1',
      [placeId]
    );
    const r = rows[0];
    const spot = r ? { name: r.name as string, category: r.primary_category as string, cuisines: (r.cuisines || []) as string[] } : null;

    const caption = await captionImage(buf.toString('base64'), mimeType, spot);
    if (!caption) return;

    // `caption is null` guard: if a human typed one while the model was thinking, theirs wins.
    const upd = await pool.query(
      'update photos set caption = $2 where id = $1 and caption is null',
      [photoId, caption]
    );
    if (upd.rowCount && r?.slug) revalidateSpot(r.slug as string);
  } catch (e) {
    await pool
      .query('insert into worker_log (decision, model, reason) values ($1, $2, $3)', [
        'caption_failed',
        'caption',
        `photo ${photoId}: ${String(e).slice(0, 300)}`,
      ])
      .catch(() => {});
  }
}
