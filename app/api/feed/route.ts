import { NextRequest, NextResponse } from 'next/server';
import { getAllSpots } from '@/lib/spots';
import { verdictFor } from '@/components/VerdictStamp';

export const dynamic = 'force-dynamic';

/**
 * The Feed Me pool, fetched on demand.
 *
 * The homepage hands FeedMe its pool as a prop because it is already rendering the whole spot
 * list. The 404 page cannot: a root not-found is prerendered statically, so anything baked into
 * it at build time goes stale the moment a spot is added. Fetching on the first roll keeps that
 * page static and cheap while the pick stays honest.
 *
 * `tiers` restricts the pool to a set of verdicts (e.g. WORTH THE GRAVEL, WORTH IT). Omit it and
 * you get every open spot, which is what the homepage would get if it ever asked.
 */
export async function GET(req: NextRequest) {
  const tiers = (req.nextUrl.searchParams.get('tiers') || '')
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);

  const spots = await getAllSpots();
  let pool = spots.filter((s) => !s.comingSoon);

  // A spot's verdict is Anthony's explicit call when he has made one, else the rating-derived
  // ladder. Same precedence VerdictStamp renders, from the same function, so the tier you filter
  // on is always the tier shown on the page.
  if (tiers.length) pool = pool.filter((s) => tiers.includes(s.verdict || verdictFor(s.ratingGoogle)));

  return NextResponse.json({
    spots: pool.map((s) => ({
      slug: s.slug,
      name: s.name,
      category: s.category,
      hook: s.hook,
      rating: s.ratingGoogle,
      priceTier: s.priceTier,
    })),
  });
}
