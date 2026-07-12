import { cache } from 'react';
import { pool } from './db';
import { uploadUrl } from './uploads';
import { ownerHoursToGoogle } from './owner';
import { AMENITY_TAGS, MEAL_TAGS, FACILITY_GROUPS, ownershipOf, OWNERSHIP_LABEL } from '@/lib/tags';
import { tallyTraits, type TraitTally } from '@/lib/traits';
import { leanderDayIdx } from '@/lib/hours';

// Extracted menu (transcribed from the photos marked 📋 Menu; editable in the admin).
// Prices are strings straight off the printed menu ("14", "3/5/8" for S/M/L) so nothing gets invented.
export type MenuItem = { name: string; desc?: string; price?: string };
export type MenuSection = { name: string; note?: string; items: MenuItem[] };
export type MenuData = {
  sections: MenuSection[];
  note?: string;        // one-liner shown under the H1, Anthony's voice
  extracted?: string;   // YYYY-MM-DD the transcription was made
  photoIds?: number[];  // photos it was read from
};

export type Spot = {
  id: string;
  slug: string;
  name: string;
  category: string;
  cuisines: string[];
  ratingGoogle: number | null;
  ratingCount: number | null;
  addressLine: string;
  hoursToday: string | null;
  weekHours: string[] | null;
  periods: number[][];
  open24: boolean;
  openLate: boolean;
  mapsUrl: string | null;
  menuUrl: string | null;
  orderUrl: string | null;
  website: string | null;
  phone: string | null;
  chainStatus: string;
  chainTier: string | null;
  badges: string[];
  amenities: string[];
  meals: string[]; // Breakfast / Brunch / Lunch / Dinner
  facilities: { group: string; labels: string[] }[]; // parking, access, restroom, payment
  summary: string | null;
  priceTier: number | null;
  photo: string | null;
  photoCredit: string | null;
  localPhotos: { id: number; filename: string; url: string; caption: string | null; isMenu?: boolean; isHeader?: boolean }[];
  menus: { id: number; filename: string; url: string; caption: string | null; isMenu?: boolean }[];
  headerPhoto: { id: number; filename: string; url: string; caption: string | null } | null;
  updatedAt: Date | null;
  hook: string | null;
  verdict: string | null;
  review: string | null;
  whatToOrder: string | null;
  gotcha: string | null;
  summaryNote: string | null;
  cantWait: string | null;
  visited: boolean;
  visitedDate: string | null;
  happyHour: string | null;
  ownerBlurb: string | null;
  logo: string | null; // owner-uploaded logo, already cleaned up. Full URL.
  worthIt: number;
  itsFine: number;
  skipIt: number;
  beenHere: number;
  wantToGo: number;
  menuData: MenuData | null;
  comingSoon: boolean;
  openingNote: string | null;
};

// Lightweight shape for cards/grid (no heavy review prose) - keeps the client payload small.
export type CardSpot = Pick<Spot,
  'id' | 'slug' | 'name' | 'category' | 'cuisines' | 'ratingGoogle' | 'priceTier' | 'addressLine' |
  'hoursToday' | 'periods' | 'open24' | 'openLate' | 'photo' | 'photoCredit' | 'verdict' | 'hook' | 'badges' | 'amenities' |
  'meals' | 'facilities' | 'chainStatus' | 'chainTier' | 'beenHere' | 'worthIt' | 'itsFine' | 'skipIt' | 'wantToGo' | 'visited' | 'happyHour' | 'localPhotos' | 'headerPhoto' | 'comingSoon'>;

// HOUSE RULE: no em/en dashes anywhere on the site. Prose -> comma; ranges -> hyphen.
// Preserves paragraph breaks (\n\n) and real hyphens (Chick-fil-A).
function clean(s: string | null | undefined): string | null {
  if (s == null) return null;
  const v = String(s)
    .replace(/[ \t]*[—–][ \t]*/g, ', ')
    .replace(/ ,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/,(\s*[.!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .replace(/^["']+|["']+$/g, '') // safety net: strip stray wrapping quotes from scraped imports
    .trim();
  return v.length ? v : null;
}
function cleanRange(s: string | null | undefined): string | null {
  if (s == null) return null;
  return String(s).replace(/[ \t]*[—–][ \t]*/g, ' - ');
}
function cleanHappyHour(s: string | null | undefined): string | null {
  if (s == null) return null;
  const i = s.toLowerCase().indexOf('happy hour');
  const v = (i >= 0 ? s.slice(i) : s).replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim();
  return v.slice(0, 160) || null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(r: any): Spot {
  const a = r.attributes || {};
  const oc = r.owner_content || {}; // owner-contributed (claimed) — overrides facts only, never editorial
  const ratings = r.ratings || {};
  const ed = r.editorial || {};
  const hoursSrc = (Array.isArray(oc.hours) && oc.hours.length === 7) ? ownerHoursToGoogle(oc.hours) : r.hours;
  const week: string[] | null = hoursSrc?.weekdayDescriptions || null;
  const todayIdx = leanderDayIdx(); // NOT getDay(): the server is UTC and rolls over at 7pm Central
  const badges: string[] = [];
  if (r.primary_category === 'Food Truck') badges.push('Food Truck');
  // ownershipOf reads chainStatus AND chainTier. Testing chainStatus alone for 'regional' never
  // matched: chainStatus only ever holds 'local' or 'chain', so 12 Texas chains had no badge.
  const own = ownershipOf(a.chainStatus, a.chainTier);
  if (own) badges.push(OWNERSHIP_LABEL[own]);
  // Patio / Dog-Friendly / Veg used to be repeated here AND in the amenity list below. The exact
  // duplicates were swallowed by the Set at the render site, but 'Veg' and 'Veg Options' are two
  // different strings for one thing, so BOTH rendered on the page. The amenity loop covers all three.
  // Lead badges: heuristic Hidden Gem / Local Favorite (same signal as the Hidden Gems page),
  // plus any editorial.badges the admin has hand-pinned. These render first on cards.
  const lead: string[] = [];
  const gr = ratings.google?.rating ?? 0;
  const gc = ratings.google?.count ?? 0;
  const comingSoon = ed.openingStatus === 'coming_soon';
  if (comingSoon) lead.push('Coming Soon'); // renders first, ahead of Hidden Gem etc.
  if (r.is_hidden_gem) lead.push('Hidden Gem');
  else if (a.chainStatus === 'local' && gr >= 4.6 && gc > 150) lead.push('Local Favorite');
  if (Array.isArray(ed.badges)) for (const b of ed.badges) if (!lead.includes(b)) lead.push(b);
  // The vocabulary lives in lib/tags.ts, so the chips Anthony toggles in the admin are provably the
  // chips a diner sees here. It used to be a private array in this function that nothing else knew about.
  const amenities: string[] = [];
  for (const [k, label] of AMENITY_TAGS) if (a[k]) amenities.push(label);
  const meals: string[] = [];
  for (const [k, label] of MEAL_TAGS) if (a[k]) meals.push(label);
  const facilities = FACILITY_GROUPS
    .map((g) => ({ group: g.group, labels: g.tags.filter(([k]) => a[k]).map(([, l]) => l) }))
    .filter((g) => g.labels.length > 0);
  const hrs = parseHours(hoursSrc);
  const photosAll = (r.local_photos || []).map((p: any) => ({ id: p.id, filename: p.filename, url: uploadUrl(p.filename), caption: clean(p.caption), isMenu: !!p.is_menu, isHeader: !!p.is_header }));
  const headerPhoto = photosAll.find((p: { isMenu: boolean; isHeader: boolean }) => p.isHeader && !p.isMenu) || null;
  return {
    id: r.id, slug: r.slug, name: clean(r.name) || r.name, category: r.primary_category, cuisines: r.cuisines || [],
    ratingGoogle: ratings.google?.rating ?? null, ratingCount: ratings.google?.count ?? null,
    addressLine: clean((r.address_formatted || '').replace(/,?\s*USA$/, '')) || '',
    hoursToday: week ? cleanRange(week[todayIdx]) : null,
    weekHours: week ? week.map((w) => cleanRange(w) as string) : null,
    periods: hrs.periods, open24: hrs.open24, openLate: hrs.openLate,
    mapsUrl: r.google_maps_url || null, menuUrl: oc.menuUrl || a.menuUrl || null, orderUrl: oc.orderUrl || a.orderUrl || null,
    website: oc.website || a.website || null, phone: oc.phone || a.phone || null,
    chainStatus: a.chainStatus || 'unknown', chainTier: a.chainTier || null,
    badges: [...lead, ...badges.filter((b) => !lead.includes(b))], amenities, meals, facilities, summary: clean(a.editorialSummary), priceTier: r.price_tier ?? null,
    photo: r.photos?.[0]?.name || null, photoCredit: r.photos?.[0]?.attribution?.[0] || null,
    localPhotos: photosAll.filter((p: { isMenu: boolean }) => !p.isMenu),
    menus: photosAll.filter((p: { isMenu: boolean }) => p.isMenu),
    headerPhoto,
    updatedAt: r.updated_at || null,
    hook: clean(ed.hook), verdict: ed.verdict || null, review: clean(ed.review),
    whatToOrder: clean(ed.whatToOrder), gotcha: clean(ed.gotcha),
    summaryNote: clean(ed.summaryNote), cantWait: clean(ed.cantWait),
    visited: !!ed.visited, visitedDate: ed.visitedDate || null,
    happyHour: cleanHappyHour(oc.happyHour || r.happy_hour),
    ownerBlurb: clean(oc.blurb),
    logo: oc.logo ? uploadUrl(oc.logo) : null,
    worthIt: r.worth_it_ct || 0, itsFine: r.its_fine_ct || 0, skipIt: r.skip_it_ct || 0,
    beenHere: r.been_here_ct || 0, wantToGo: r.want_to_go_ct || 0,
    menuData: (r.menu && Array.isArray(r.menu.sections) && r.menu.sections.length) ? r.menu as MenuData : null,
    comingSoon,
    openingNote: clean(ed.openingNote),
  };
}

// Local first, then Texas/regional chains, then national chains (and unknowns) to the back.
// Local first, then Texas chains, then national to the back. Must read chainTier, exactly like
// ownershipOf() does, or Whataburger sorts with McDonald's.
const OWN_RANK = `case
  when attributes->>'chainTier' in ('regional','regional-tx') then 1
  when attributes->>'chainTier' = 'national' then 2
  when attributes->>'chainStatus' = 'chain' then 2
  when attributes->>'chainStatus' = 'local' then 0
  else 3 end`;
const ORDER = `order by (${OWN_RANK}), (ratings#>>'{google,rating}')::float desc nulls last, (ratings#>>'{google,count}')::int desc nulls last, name`;
const PHOTOS = `(select coalesce(json_agg(json_build_object('id',id,'filename',filename,'caption',caption,'is_menu',is_menu,'is_header',is_header) order by sort, created_at),'[]'::json) from photos where place_id = restaurants.id and status = 'approved') as local_photos`;
// Hidden Gem is a CURATED top 8: highest-rated local spots with a small review count.
const GEM_WHERE = `not hidden and attributes->>'chainStatus' = 'local' and (ratings#>>'{google,rating}')::float >= 4.5 and coalesce((ratings#>>'{google,count}')::int, 0) between 1 and 150`;
const GEM_ORDER = `order by (ratings#>>'{google,rating}')::float desc nulls last, (ratings#>>'{google,count}')::int desc nulls last`;
export const HIDDEN_GEM = `(restaurants.slug in (select slug from restaurants where ${GEM_WHERE} ${GEM_ORDER} limit 8)) as is_hidden_gem`;

export async function getAllSpots(): Promise<Spot[]> {
  const { rows } = await pool.query(`select *, ${PHOTOS}, ${HIDDEN_GEM} from restaurants where not hidden ${ORDER}`);
  return rows.map(mapRow);
}

export type MapPin = {
  slug: string; name: string; lat: number; lng: number; cat: string; cuisines: string[];
  happyHour: boolean; happyHourText: string | null; openLate: boolean; hiddenGem: boolean; priceTier: number | null;
  rating: number | null; hook: string | null; visited: boolean;
  periods: number[][]; open24: boolean; hoursText: string[];
  patio: boolean; dog: boolean; veg: boolean;
  // Added for the map filters. All of it was already in the database and none of it was reaching the map.
  hasEvent: boolean; eventText: string | null;   // something on the What's On board
  meals: string[];                               // Breakfast / Brunch / Lunch / Dinner
  ownership: string | null;                      // local | texas | chain
  stepFree: boolean; freeParking: boolean; takeout: boolean;
};

// Google hours -> compact [openAbs, closeAbs] minute-of-week pairs (closeAbs wraps
// past 10080 when a period runs past midnight). open_late = closes >=10pm or after midnight.
function parseHours(h: { periods?: { open?: { day: number; hour?: number; minute?: number }; close?: { day: number; hour?: number; minute?: number } }[]; weekdayDescriptions?: string[] } | null): { periods: number[][]; open24: boolean; openLate: boolean; text: string[] } {
  if (!h || !Array.isArray(h.periods)) return { periods: [], open24: false, openLate: false, text: [] };
  if (h.periods.length === 1 && h.periods[0]?.open && !h.periods[0]?.close) return { periods: [], open24: true, openLate: true, text: h.weekdayDescriptions || [] };
  const periods: number[][] = []; let openLate = false;
  for (const p of h.periods) {
    if (!p?.open || !p?.close) continue;
    const oAbs = p.open.day * 1440 + (p.open.hour || 0) * 60 + (p.open.minute || 0);
    let cAbs = p.close.day * 1440 + (p.close.hour || 0) * 60 + (p.close.minute || 0);
    if (cAbs <= oAbs) cAbs += 10080;
    periods.push([oAbs, cAbs]);
    const ch = p.close.hour || 0;
    if (ch >= 22 || ch < 4) openLate = true;
  }
  return { periods, open24: false, openLate, text: h.weekdayDescriptions || [] };
}

// Lean per-pin payload for the map. ~177 rows, all with coords.
export async function getMapPins(): Promise<MapPin[]> {
  const { rows } = await pool.query(
    // NOTE: no table alias. HIDDEN_GEM hardcodes `restaurants.slug`, so aliasing the table to `r`
    // makes the whole query fail with "invalid reference to FROM-clause entry".
    `select slug, name, lat, lng, primary_category cat, coalesce(cuisines,'{}') cuisines,
       happy_hour, hours, attributes,
       ${HIDDEN_GEM}, price_tier, (ratings#>>'{google,rating}')::float rating,
       editorial->>'hook' hook, coalesce((editorial->>'visited')::bool,false) visited,
       -- Anything live on the What's On board. Same LIVE rules as lib/events.ts: approved, not
       -- brunch (that is a service, not an event), and inside its run dates.
       (select count(*) from events e
         where e.place_id = restaurants.id and e.status = 'approved' and e.event_type <> 'brunch'
           and (e.expires_at is null or e.expires_at > now())
           and (e.starts_on is null or e.starts_on <= current_date)
           and (e.ends_on   is null or e.ends_on   >= current_date))::int as event_count,
       (select e.title from events e
         where e.place_id = restaurants.id and e.status = 'approved' and e.event_type <> 'brunch'
           and (e.expires_at is null or e.expires_at > now())
           and (e.ends_on is null or e.ends_on >= current_date)
         order by e.created_at limit 1) as event_title
     from restaurants where lat is not null and lng is not null and not hidden`
  );
  return rows.map((r) => {
    const h = parseHours(r.hours);
    const a = r.attributes || {};
    const happyText = cleanHappyHour(r.happy_hour);
    return {
      slug: r.slug, name: clean(r.name) || r.name, lat: Number(r.lat), lng: Number(r.lng),
      cat: r.cat, cuisines: r.cuisines || [], happyHour: !!happyText, happyHourText: happyText || null, openLate: h.openLate,
      hiddenGem: !!r.is_hidden_gem, priceTier: r.price_tier ?? null, rating: r.rating ?? null,
      hook: clean(r.hook), visited: !!r.visited,
      periods: h.periods, open24: h.open24, hoursText: h.text,
      patio: !!a.outdoorSeating, dog: !!a.allowsDogs, veg: !!a.servesVegetarianFood,
      hasEvent: (r.event_count ?? 0) > 0,
      eventText: clean(r.event_title),
      meals: MEAL_TAGS.filter(([k]) => a[k]).map(([, label]) => label),
      ownership: ownershipOf(a.chainStatus, a.chainTier),
      stepFree: !!a.wheelchairAccessibleEntrance,
      freeParking: !!(a.freeParkingLot || a.freeStreetParking || a.freeGarageParking),
      takeout: !!a.takeout,
    };
  });
}
export const getSpot = cache(async (slug: string): Promise<Spot | null> => {
  const { rows } = await pool.query(`select *, ${PHOTOS}, ${HIDDEN_GEM} from restaurants where slug = $1 and not hidden`, [slug]);
  return rows[0] ? mapRow(rows[0]) : null;
});

/**
 * The same spot, hidden or not. ONLY for the owner desk and the admin.
 *
 * The public getSpot() filters `not hidden` and must keep doing so. But an owner whose listing is
 * temporarily hidden still has to be able to manage it, and the owner-desk demo restaurant is hidden
 * from the public site on purpose. Never call this from a public page.
 */
export const getSpotAny = cache(async (slug: string): Promise<Spot | null> => {
  const { rows } = await pool.query(`select *, ${PHOTOS}, ${HIDDEN_GEM} from restaurants where slug = $1`, [slug]);
  return rows[0] ? mapRow(rows[0]) : null;
});

export async function getTips(slug: string): Promise<{ body: string }[]> {
  const { rows } = await pool.query(
    `select t.body from tips t join restaurants r on r.id = t.place_id
     where r.slug = $1 and t.status = 'approved' order by t.created_at desc limit 20`,
    [slug]
  );
  return rows.map((r) => ({ body: clean(r.body) || r.body }));
}

export type ReaderReview = { stars: number; body: string | null; who: string; tip: string | null; traits: string[] };

export async function getReviews(slug: string): Promise<{
  avg: number | null; count: number; list: ReaderReview[]; tips: string[]; traits: TraitTally[];
}> {
  const { rows } = await pool.query(
    `select rv.stars, rv.body, rv.user_email, rv.tip, coalesce(rv.traits,'{}') traits
       from reviews rv join restaurants r on r.id = rv.place_id
      where r.slug = $1 and rv.status = 'approved' order by rv.created_at desc limit 40`, [slug]);
  const list: ReaderReview[] = rows.map((r) => ({
    stars: r.stars as number,
    body: clean(r.body),
    who: (r.user_email || 'a local').split('@')[0],
    tip: clean(r.tip),
    traits: (r.traits || []) as string[],
  }));
  const count = list.length;
  // suppress the headline average until there's enough signal (anti single-fake-star)
  const avg = count >= 3 ? Math.round((list.reduce((a, b) => a + b.stars, 0) / count) * 10) / 10 : null;
  // The practical notes, which used to be their own "tips" table and their own form. Reviews carry
  // them now, so they arrive attached to the visit they came from.
  const tips = list.map((r) => r.tip).filter((t): t is string => !!t);
  return { avg, count, list, tips, traits: tallyTraits(list) };
}

export async function getOwnerResponses(slug: string): Promise<{ body: string }[]> {
  const { rows } = await pool.query(
    `select o.body from owner_responses o join restaurants r on r.id = o.place_id where r.slug = $1 order by o.created_at desc`, [slug]);
  return rows.map((r) => ({ body: clean(r.body) || r.body }));
}

export async function isVerifiedOwner(slug: string, email?: string | null): Promise<boolean> {
  if (!email) return false;
  const { rows } = await pool.query(
    `select 1 from claims c join restaurants r on r.id = c.place_id
     where r.slug = $1 and lower(c.user_email) = lower($2) and c.status = 'verified' limit 1`, [slug, email]);
  return rows.length > 0;
}
export async function getHiddenGems(): Promise<Spot[]> {
  // The auto top 8, plus any spot hand-pinned as a Hidden Gem (e.g. Leander Grocery) -> matches the badged set.
  const { rows } = await pool.query(
    `select *, ${PHOTOS}, ${HIDDEN_GEM} from restaurants
     where (slug in (select slug from restaurants where ${GEM_WHERE} ${GEM_ORDER} limit 8)
        or editorial->'badges' ? 'Hidden Gem') and not hidden
     ${GEM_ORDER}`
  );
  return rows.map(mapRow);
}
export type NewItem = { slug: string; name: string; category: string; status: string; note: string | null; when: Date | null };
export async function getNewInLeander(): Promise<NewItem[]> {
  const { rows } = await pool.query(
    `select slug, name, primary_category cat, editorial->>'openingStatus' status, editorial->>'openingNote' note, updated_at
     from restaurants
     where coalesce(editorial->>'openingStatus','') <> '' and not hidden
     order by updated_at desc limit 60`
  );
  return rows.map((r) => ({ slug: r.slug, name: clean(r.name) || r.name, category: r.cat, status: r.status, note: clean(r.note), when: r.updated_at }));
}

export type InkItem = { kind: 'new' | 'rave' | 'buzz'; slug: string; name: string; note: string | null };

// FRESH INK: the home heartbeat, assembled from real activity.
export async function getFreshInk(): Promise<InkItem[]> {
  const [fresh, raves, buzz] = await Promise.all([
    pool.query(`select slug, name, primary_category cat from restaurants
                where not hidden and coalesce(attributes->>'chainStatus','') <> 'chain'
                order by created_at desc limit 4`),
    pool.query(`select slug, name, editorial->>'hook' hook from restaurants
                where editorial->>'verdict'='WORTH THE GRAVEL' and not hidden
                order by (ratings#>>'{google,rating}')::float desc nulls last, (ratings#>>'{google,count}')::int desc nulls last limit 6`),
    pool.query(`select r.slug, r.name, (r.worth_it_ct + r.been_here_ct) tot from restaurants r
                where (r.worth_it_ct + r.been_here_ct) > 0 and not r.hidden order by tot desc limit 3`),
  ]);
  const items: InkItem[] = [];
  for (const r of fresh.rows) items.push({ kind: 'new', slug: r.slug, name: clean(r.name) || r.name, note: `New to the guide · ${r.cat}` });
  for (const r of raves.rows) items.push({ kind: 'rave', slug: r.slug, name: clean(r.name) || r.name, note: clean(r.hook) });
  for (const r of buzz.rows) items.push({ kind: 'buzz', slug: r.slug, name: clean(r.name) || r.name, note: `${r.tot} locals weighed in` });
  return items;
}

export async function countSpots(): Promise<{ total: number; local: number; regional: number; chain: number }> {
  const { rows } = await pool.query(
    `select count(*)::int total,
            count(*) filter (where (${OWN_RANK}) = 0)::int local,
            count(*) filter (where attributes->>'chainTier' in ('regional','regional-tx'))::int regional,
            count(*) filter (where (${OWN_RANK}) = 2)::int chain
     from restaurants where not hidden`
  );
  return rows[0];
}
