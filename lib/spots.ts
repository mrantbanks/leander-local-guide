import { cache } from 'react';
import { pool } from './db';
import { uploadUrl } from './uploads';

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
  openNow: boolean | null;
  mapsUrl: string | null;
  menuUrl: string | null;
  orderUrl: string | null;
  website: string | null;
  phone: string | null;
  chainStatus: string;
  chainTier: string | null;
  badges: string[];
  amenities: string[];
  summary: string | null;
  priceTier: number | null;
  photo: string | null;
  photoCredit: string | null;
  localPhotos: { id: number; filename: string; url: string }[];
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
  worthIt: number;
  itsFine: number;
  skipIt: number;
  beenHere: number;
  wantToGo: number;
};

// Lightweight shape for cards/grid (no heavy review prose) - keeps the client payload small.
export type CardSpot = Pick<Spot,
  'id' | 'slug' | 'name' | 'category' | 'cuisines' | 'ratingGoogle' | 'priceTier' | 'addressLine' |
  'hoursToday' | 'openNow' | 'photo' | 'photoCredit' | 'verdict' | 'hook' | 'badges' | 'amenities' |
  'chainStatus' | 'beenHere' | 'worthIt' | 'itsFine' | 'skipIt' | 'wantToGo' | 'happyHour' | 'localPhotos'>;

// HOUSE RULE: no em/en dashes anywhere on the site. Prose -> comma; ranges -> hyphen.
// Preserves paragraph breaks (\n\n) and real hyphens (Chick-fil-A).
function clean(s: string | null | undefined): string | null {
  if (s == null) return null;
  return String(s)
    .replace(/[ \t]*[—–][ \t]*/g, ', ')
    .replace(/ ,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/,(\s*[.!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
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

// Current time in Leander (Central) regardless of server TZ.
function chicagoNow(): { day: number; mins: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const days: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = days[get('weekday')] ?? 0;
  const hour = parseInt(get('hour'), 10) % 24;
  const mins = hour * 60 + parseInt(get('minute'), 10);
  return { day, mins };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function isOpenNow(periods: any[] | undefined): boolean | null {
  if (!periods || !periods.length) return null;
  const { day, mins } = chicagoNow();
  for (const p of periods) {
    if (!p.open) continue;
    const od = p.open.day, om = (p.open.hour || 0) * 60 + (p.open.minute || 0);
    if (!p.close) { if (od === day) return true; continue; }
    const cd = p.close.day, cm = (p.close.hour || 0) * 60 + (p.close.minute || 0);
    if (od === cd) { if (day === od && mins >= om && mins < cm) return true; }
    else { if (day === od && mins >= om) return true; if (day === cd && mins < cm) return true; }
  }
  return false;
}

function mapRow(r: any): Spot {
  const a = r.attributes || {};
  const ratings = r.ratings || {};
  const ed = r.editorial || {};
  const week: string[] | null = r.hours?.weekdayDescriptions || null;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const badges: string[] = [];
  if (r.primary_category === 'Food Truck') badges.push('Food Truck');
  if (a.chainStatus === 'chain') badges.push('Chain');
  else if (a.chainStatus === 'local') badges.push('Local');
  if (a.outdoorSeating) badges.push('Patio');
  if (a.allowsDogs) badges.push('Dog-Friendly');
  if (a.servesVegetarianFood) badges.push('Veg');
  // Lead badges: heuristic Hidden Gem / Local Favorite (same signal as the Hidden Gems page),
  // plus any editorial.badges the admin has hand-pinned. These render first on cards.
  const lead: string[] = [];
  const gr = ratings.google?.rating ?? 0;
  const gc = ratings.google?.count ?? 0;
  if (r.is_hidden_gem) lead.push('Hidden Gem');
  else if (a.chainStatus === 'local' && gr >= 4.6 && gc > 150) lead.push('Local Favorite');
  if (Array.isArray(ed.badges)) for (const b of ed.badges) if (!lead.includes(b)) lead.push(b);
  const amenities: string[] = [];
  const amen: [string, string][] = [
    ['outdoorSeating', 'Patio'], ['allowsDogs', 'Dog-Friendly'], ['goodForChildren', 'Kid-Friendly'],
    ['goodForGroups', 'Good for Groups'], ['servesVegetarianFood', 'Veg Options'], ['servesBreakfast', 'Breakfast'],
    ['servesBrunch', 'Brunch'], ['servesBeer', 'Beer'], ['servesWine', 'Wine'], ['servesCocktails', 'Cocktails'],
    ['takeout', 'Takeout'], ['delivery', 'Delivery'], ['dineIn', 'Dine-In'], ['reservable', 'Reservations'],
    ['liveMusic', 'Live Music'], ['goodForWatchingSports', 'Sports'],
  ];
  for (const [k, label] of amen) if (a[k]) amenities.push(label);
  return {
    id: r.id, slug: r.slug, name: clean(r.name) || r.name, category: r.primary_category, cuisines: r.cuisines || [],
    ratingGoogle: ratings.google?.rating ?? null, ratingCount: ratings.google?.count ?? null,
    addressLine: clean((r.address_formatted || '').replace(/,?\s*USA$/, '')) || '',
    hoursToday: week ? cleanRange(week[todayIdx]) : null,
    weekHours: week ? week.map((w) => cleanRange(w) as string) : null,
    openNow: isOpenNow(r.hours?.periods),
    mapsUrl: r.google_maps_url || null, menuUrl: a.menuUrl || null, orderUrl: a.orderUrl || null,
    website: a.website || null, phone: a.phone || null,
    chainStatus: a.chainStatus || 'unknown', chainTier: a.chainTier || null,
    badges: [...lead, ...badges.filter((b) => !lead.includes(b))], amenities, summary: clean(a.editorialSummary), priceTier: r.price_tier ?? null,
    photo: r.photos?.[0]?.name || null, photoCredit: r.photos?.[0]?.attribution?.[0] || null,
    localPhotos: (r.local_photos || []).map((p: any) => ({ id: p.id, filename: p.filename, url: uploadUrl(p.filename) })),
    updatedAt: r.updated_at || null,
    hook: clean(ed.hook), verdict: ed.verdict || null, review: clean(ed.review),
    whatToOrder: clean(ed.whatToOrder), gotcha: clean(ed.gotcha),
    summaryNote: clean(ed.summaryNote), cantWait: clean(ed.cantWait),
    visited: !!ed.visited, visitedDate: ed.visitedDate || null,
    happyHour: cleanHappyHour(r.happy_hour),
    worthIt: r.worth_it_ct || 0, itsFine: r.its_fine_ct || 0, skipIt: r.skip_it_ct || 0,
    beenHere: r.been_here_ct || 0, wantToGo: r.want_to_go_ct || 0,
  };
}

const ORDER = `order by (attributes->>'chainStatus' = 'chain'), (ratings#>>'{google,rating}')::float desc nulls last, (ratings#>>'{google,count}')::int desc nulls last, name`;
const PHOTOS = `(select coalesce(json_agg(json_build_object('id',id,'filename',filename) order by sort, created_at),'[]'::json) from photos where place_id = restaurants.id and status = 'approved') as local_photos`;
// Hidden Gem is a CURATED top 8: highest-rated local spots with a small review count.
const GEM_WHERE = `attributes->>'chainStatus' = 'local' and (ratings#>>'{google,rating}')::float >= 4.5 and coalesce((ratings#>>'{google,count}')::int, 0) between 1 and 150`;
const GEM_ORDER = `order by (ratings#>>'{google,rating}')::float desc nulls last, (ratings#>>'{google,count}')::int desc nulls last`;
const HIDDEN_GEM = `(restaurants.slug in (select slug from restaurants where ${GEM_WHERE} ${GEM_ORDER} limit 8)) as is_hidden_gem`;

export async function getAllSpots(): Promise<Spot[]> {
  const { rows } = await pool.query(`select *, ${PHOTOS}, ${HIDDEN_GEM} from restaurants ${ORDER}`);
  return rows.map(mapRow);
}
export const getSpot = cache(async (slug: string): Promise<Spot | null> => {
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

export async function getReviews(slug: string): Promise<{ avg: number | null; count: number; list: { stars: number; body: string | null; who: string }[] }> {
  const { rows } = await pool.query(
    `select rv.stars, rv.body, rv.user_email from reviews rv join restaurants r on r.id = rv.place_id
     where r.slug = $1 and rv.status = 'approved' order by rv.created_at desc limit 40`, [slug]);
  const list = rows.map((r) => ({ stars: r.stars as number, body: clean(r.body), who: (r.user_email || 'a local').split('@')[0] }));
  const count = list.length;
  // suppress the headline average until there's enough signal (anti single-fake-star)
  const avg = count >= 3 ? Math.round((list.reduce((a, b) => a + b.stars, 0) / count) * 10) / 10 : null;
  return { avg, count, list };
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
     where slug in (select slug from restaurants where ${GEM_WHERE} ${GEM_ORDER} limit 8)
        or editorial->'badges' ? 'Hidden Gem'
     ${GEM_ORDER}`
  );
  return rows.map(mapRow);
}
export type NewItem = { slug: string; name: string; category: string; status: string; note: string | null; when: Date | null };
export async function getNewInLeander(): Promise<NewItem[]> {
  const { rows } = await pool.query(
    `select slug, name, primary_category cat, editorial->>'openingStatus' status, editorial->>'openingNote' note, updated_at
     from restaurants
     where coalesce(editorial->>'openingStatus','') <> ''
     order by updated_at desc limit 60`
  );
  return rows.map((r) => ({ slug: r.slug, name: clean(r.name) || r.name, category: r.cat, status: r.status, note: clean(r.note), when: r.updated_at }));
}

export type InkItem = { kind: 'new' | 'rave' | 'buzz'; slug: string; name: string; note: string | null };

// FRESH INK: the home heartbeat, assembled from real activity.
export async function getFreshInk(): Promise<InkItem[]> {
  const [fresh, raves, buzz] = await Promise.all([
    pool.query(`select slug, name, primary_category cat from restaurants order by created_at desc limit 4`),
    pool.query(`select slug, name, editorial->>'hook' hook from restaurants
                where editorial->>'verdict'='WORTH THE GRAVEL'
                order by (ratings#>>'{google,rating}')::float desc nulls last, (ratings#>>'{google,count}')::int desc nulls last limit 6`),
    pool.query(`select r.slug, r.name, (r.worth_it_ct + r.been_here_ct) tot from restaurants r
                where (r.worth_it_ct + r.been_here_ct) > 0 order by tot desc limit 3`),
  ]);
  const items: InkItem[] = [];
  for (const r of fresh.rows) items.push({ kind: 'new', slug: r.slug, name: clean(r.name) || r.name, note: `New to the guide · ${r.cat}` });
  for (const r of raves.rows) items.push({ kind: 'rave', slug: r.slug, name: clean(r.name) || r.name, note: clean(r.hook) });
  for (const r of buzz.rows) items.push({ kind: 'buzz', slug: r.slug, name: clean(r.name) || r.name, note: `${r.tot} locals weighed in` });
  return items;
}

export async function countSpots(): Promise<{ total: number; local: number; chain: number }> {
  const { rows } = await pool.query(
    `select count(*)::int total,
            count(*) filter (where attributes->>'chainStatus'='local')::int local,
            count(*) filter (where attributes->>'chainStatus'='chain')::int chain
     from restaurants`
  );
  return rows[0];
}
