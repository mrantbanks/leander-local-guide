/**
 * The tag vocabulary. ONE definition, read by the public page (lib/spots.ts) and by the admin
 * editor, so the chips Anthony toggles are provably the chips a diner sees.
 *
 * Tags come from four different places, and that is the thing the admin screen has to make obvious,
 * because you cannot edit what you cannot see the source of:
 *
 *   1. CATEGORY   primary_category. "Food Truck" shows as a tag. Editable (a select).
 *   2. OWNERSHIP  attributes.chainStatus: local | regional | chain. Editable (a select).
 *   3. AMENITIES  attributes.<bool>, imported from Google Places. Editable (toggles), because Google
 *                 is often wrong and Anthony has actually stood in the room.
 *   4. EDITORIAL  editorial.badges, hand-pinned by Anthony. Editable (toggles).
 *
 * And two are COMPUTED and therefore not directly editable:
 *   - "Hidden Gem"     the top 8 local spots rated >= 4.5 with a small review count (lib/spots.ts).
 *                      It can still be hand-pinned as an editorial badge to force it on.
 *   - "Local Favorite" local AND rating >= 4.6 AND more than 150 reviews.
 */

/** attributes.<key> -> the tag a diner sees. This list WAS duplicated inside lib/spots.ts mapRow. */
export const AMENITY_TAGS: [string, string][] = [
  ['outdoorSeating', 'Patio'],
  ['allowsDogs', 'Dog-Friendly'],
  ['goodForChildren', 'Kid-Friendly'],
  ['goodForGroups', 'Good for Groups'],
  // Was 'Veg' in the badge list and 'Veg Options' in the amenity list: two strings for one thing, so
  // both rendered side by side on the page. One name now.
  ['servesVegetarianFood', 'Veg Options'],
  ['servesBreakfast', 'Breakfast'],
  ['servesBrunch', 'Brunch'],
  ['servesBeer', 'Beer'],
  ['servesWine', 'Wine'],
  ['servesCocktails', 'Cocktails'],
  ['takeout', 'Takeout'],
  ['delivery', 'Delivery'],
  ['dineIn', 'Dine-In'],
  ['reservable', 'Reservations'],
  ['liveMusic', 'Live Music'],
  ['goodForWatchingSports', 'Sports'],
];

export const CHAIN_STATUS: { value: string; label: string; help: string }[] = [
  { value: 'local', label: 'Local', help: 'Independent. Not a chain. This is the guide\'s whole point.' },
  { value: 'regional', label: 'Texas Chain', help: 'A Texas chain, e.g. Whataburger. Sorted below local spots.' },
  { value: 'chain', label: 'Chain', help: 'A national chain. Sorted last, everywhere.' },
  { value: 'unknown', label: 'Unknown', help: 'Not classified yet. Renders no ownership tag at all.' },
];

/** The venue types. "Food Truck" is the only one that also renders as a tag on the page. */
export const CATEGORIES = [
  'Restaurant', 'Food Truck', 'Cafe', 'Coffee Shop', 'Bakery', 'Bar', 'Brewery',
  'Dessert', 'Ice Cream Shop', 'Donut Shop', 'Tea House',
];

/** editorial.badges. Hand-pinned by Anthony, and they render FIRST, ahead of everything else. */
export const EDITORIAL_BADGES = [
  "Anthony's Pick",
  'Hidden Gem',
  'New',
  'Happy Hour',
  'Worth the Drive',
  'Late Night',
  'Cash Only',
  'Patio Weather',
];

/** Tags the code works out for itself. Shown in the admin as read-only, so nobody hunts for a toggle. */
export function computedTags(spot: {
  isHiddenGem?: boolean;
  chainStatus?: string;
  ratingGoogle?: number | null;
  ratingCount?: number | null;
  comingSoon?: boolean;
}): { label: string; why: string }[] {
  const out: { label: string; why: string }[] = [];
  if (spot.comingSoon) out.push({ label: 'Coming Soon', why: 'Opening status is set to coming soon.' });
  if (spot.isHiddenGem) {
    out.push({ label: 'Hidden Gem', why: 'One of the top 8 local spots rated 4.5+ with under 150 reviews. Recomputed automatically.' });
  } else if (spot.chainStatus === 'local' && (spot.ratingGoogle ?? 0) >= 4.6 && (spot.ratingCount ?? 0) > 150) {
    out.push({ label: 'Local Favorite', why: 'Local, rated 4.6+, and more than 150 reviews. A Local Favorite is always also Local: that is why you see both.' });
  }
  return out;
}
