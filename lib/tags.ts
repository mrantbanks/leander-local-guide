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
  ['servesDessert', 'Dessert'],
  ['servesCoffee', 'Coffee'],
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

/**
 * When they serve. Google gives us all four and we were only ever reading two of them, both filed
 * under "amenities" as if breakfast were a patio. 95 spots serve lunch and nothing on the site could
 * tell you which.
 */
export const MEAL_TAGS: [string, string][] = [
  ['servesBreakfast', 'Breakfast'],
  ['servesBrunch', 'Brunch'],
  ['servesLunch', 'Lunch'],
  ['servesDinner', 'Dinner'],
];

/**
 * The practical facts: can I park, is there a loo, can I get a wheelchair through the door, can I
 * pay with a card. Google has had all of this the whole time and our Place Details field mask simply
 * never asked for it, so 197 restaurants were missing it. One backfill later, 198 spots have it.
 *
 * Grouped, because "Free lot" and "Step-free entry" are different KINDS of fact and a diner scanning
 * for one should not have to read the other.
 */
export const FACILITY_GROUPS: { group: string; tags: [string, string][] }[] = [
  { group: 'Parking', tags: [
    ['freeParkingLot', 'Free lot'],
    ['freeStreetParking', 'Street parking'],
    ['freeGarageParking', 'Free garage'],
    ['paidParkingLot', 'Paid lot'],
    ['paidStreetParking', 'Paid street'],
    ['valetParking', 'Valet'],
  ]},
  { group: 'Getting in', tags: [
    ['wheelchairAccessibleEntrance', 'Step-free entry'],
    ['wheelchairAccessibleRestroom', 'Accessible restroom'],
    ['wheelchairAccessibleParking', 'Accessible parking'],
    ['wheelchairAccessibleSeating', 'Accessible seating'],
  ]},
  { group: 'Facilities', tags: [
    ['restroom', 'Restroom'],
  ]},
  { group: 'Paying', tags: [
    ['acceptsCreditCards', 'Cards'],
    ['acceptsDebitCards', 'Debit'],
    ['acceptsNfc', 'Tap to pay'],
    ['acceptsCashOnly', 'Cash only'],
  ]},
];

export const FACILITY_TAGS: [string, string][] = FACILITY_GROUPS.flatMap((g) => g.tags);

/**
 * Who owns it, worked out from the TWO fields that actually hold the answer.
 *
 * THE BUG THIS FIXES: everything tested `chainStatus === 'regional'`, and chainStatus is only ever
 * 'local' or 'chain'. The Texas/national distinction lives in a completely different field,
 * chainTier. So "Texas chains" read 0 on the homepage, no spot ever got the Texas Chain badge, the
 * browse filter never matched one, and the sort order treated Whataburger like a national chain.
 * Twelve Texas chains, invisible.
 *
 * chainTier is also not tidy: it holds 'national', 'regional', 'regional-tx' and 'multi-location'
 * from different import runs. Read all of them rather than pretending one vocabulary won.
 */
export type Ownership = 'local' | 'texas' | 'chain';

export function ownershipOf(chainStatus?: string | null, chainTier?: string | null): Ownership | null {
  const tier = (chainTier || '').toLowerCase();
  if (tier === 'national') return 'chain';
  if (tier === 'regional' || tier === 'regional-tx') return 'texas';
  if (chainStatus === 'chain') return 'chain';
  if (chainStatus === 'local') return 'local'; // includes local multi-location: Grand Donuts is still local
  return null; // unknown: say nothing rather than guess
}

export const OWNERSHIP_LABEL: Record<Ownership, string> = {
  local: 'Local Owned',
  texas: 'Texas Chain',
  chain: 'Chain',
};

/**
 * The picker writes BOTH fields, because one of them alone cannot express the answer. Anything that
 * only sets chainStatus is how "Texas Chain" became unreachable in the first place.
 */
export const CHAIN_STATUS: { value: Ownership | 'unknown'; label: string; help: string; status: string; tier: string | null }[] = [
  { value: 'local', label: 'Local Owned', help: "Independent, owned by someone who lives here. A local place with a few branches (Grand Donuts) still counts.", status: 'local', tier: null },
  { value: 'texas', label: 'Texas Chain', help: 'A Texas chain: Whataburger, Shipley, Golden Chick, Smokey Mo\'s. Sorted below local spots.', status: 'chain', tier: 'regional-tx' },
  { value: 'chain', label: 'Chain', help: 'A national chain. Sorted last, everywhere.', status: 'chain', tier: 'national' },
  { value: 'unknown', label: 'Unknown', help: 'Not classified. Renders no ownership tag at all.', status: 'unknown', tier: null },
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
    out.push({ label: 'Local Favorite', why: 'Local Owned, rated 4.6+, and more than 150 reviews. Local Owned is about who owns it; Local Favorite is about whether the town loves it. A Local Favorite is always also Local Owned, which is why you see both.' });
  }
  return out;
}
