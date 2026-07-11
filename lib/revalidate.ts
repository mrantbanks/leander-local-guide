import { revalidatePath } from 'next/cache';
import { pool } from '@/lib/db';

/**
 * Bust every cached surface a single spot appears on. Call this from ANY mutation that changes
 * what a visitor (or Google) would see for that spot: editorial, verdict, menu, photos, reviews,
 * tips, votes, owner content, perks, events.
 *
 * Why one helper instead of ad-hoc revalidatePath calls: the ad-hoc version had already drifted.
 * Approving a reader's photo refreshed only the moderation screen, so the restaurant page kept
 * serving the old gallery. Nothing ever refreshed /r/<slug>/menu, even though it renders the
 * verdict stamp and the address. Votes refreshed nothing at all. Stale structured data is worse
 * than no structured data, because Google reads it and believes it.
 *
 * Only /r/<slug> and /r/<slug>/menu are actually cached (ISR, 60s). Every listing page (/, /map,
 * /best, /food, /hidden-gems, /passport, /new, /whats-on) is force-dynamic and reads Postgres on
 * every request, so those cannot go stale. The admin and owner desks are force-dynamic too, but we
 * name them anyway: they are the screens a human is staring at when they make the change, and if
 * anyone ever makes them cached this keeps working.
 */
export function revalidateSpot(slug: string): void {
  if (!slug) return;
  revalidatePath(`/r/${slug}`);
  revalidatePath(`/r/${slug}/menu`); // renders the verdict stamp, name, address and menu photos too
  revalidatePath(`/admin/r/${slug}`);
  revalidatePath(`/owner/${slug}`);
}

/** Same, when all you have is the Google place id. */
export async function revalidateSpotByPlaceId(placeId: string): Promise<void> {
  if (!placeId) return;
  const { rows } = await pool.query('select slug from restaurants where id = $1', [placeId]);
  if (rows[0]?.slug) revalidateSpot(rows[0].slug);
}

/** Same, when all you have is a row in a table that points at a place. */
export async function revalidateSpotByRow(
  table: 'photos' | 'reviews' | 'tips' | 'claims' | 'specials' | 'events',
  id: number
): Promise<void> {
  const { rows } = await pool.query(
    `select r.slug from ${table} t join restaurants r on r.id = t.place_id where t.id = $1`,
    [id]
  );
  if (rows[0]?.slug) revalidateSpot(rows[0].slug);
}
