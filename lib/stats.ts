import { pool } from '@/lib/db';

/**
 * The one place stats are computed. The admin dashboard and (later) the owner desk both read from
 * here, so the two can never quietly disagree about what a number means.
 *
 * Everything in this file runs against data we ALREADY have. place_signals and passport_stamp_events
 * are complete, timestamped, place-tied event logs that nothing in the repo had ever read, and
 * reviews/tips/photos/claims/subscribers/specials all carry created_at. That is real weekly history
 * with no tracking code at all.
 *
 * What we CANNOT report yet, and must never fake: page views, menu views, and outbound link taps.
 * They were never recorded, and no amount of server-log archaeology will produce them with a
 * restaurant attached. An estimated "view" sitting next to a real confirmed stamp poisons the real
 * one, so those tiles simply do not exist until the tracker ships.
 *
 * TWO RULES, both of which have already bitten this codebase:
 *
 *  1. EVERY count is cast ::int. node-pg returns bigint (and count(*)) as a STRING. A string in a
 *     sum() concatenates instead of adding, and Number.isInteger() on it is false. That exact class
 *     of bug silently dropped 100% of Passport stamp pulls in production.
 *
 *  2. EVERY join to restaurants is a LEFT join. specials.place_id and passport_stamp_events.place_id
 *     are nullable by design (first-party Guide perks belong to no business, sql/009_guide_perks.sql),
 *     and an inner join makes them vanish from the totals without a word.
 */

export const TZ = 'America/Chicago';

/**
 * Windows are ROLLING (last 7 days, last 28, last 90), not calendar weeks.
 *
 * Deliberate: a rolling window is always complete, so "this week" never means "the two days of the
 * week that have happened so far", and week-over-week is a like-for-like comparison of two equal
 * spans. It also lets us avoid date_trunc('week') entirely, which is ISO-Monday in Postgres and
 * would silently contradict a Sunday-to-Saturday design.
 *
 * Bounds are absolute instants, so no timezone maths is needed to filter. Timezone only matters if
 * we ever bucket into named days, which nothing here does.
 */
export type Win = '7d' | '28d' | '90d' | 'all';

export const WINDOWS: { key: Win; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '28d', label: 'Last 28 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'all', label: 'All time' },
];

const DAYS: Record<Win, number | null> = { '7d': 7, '28d': 28, '90d': 90, all: null };

export type Bounds = { from: Date | null; to: Date; prev: { from: Date; to: Date } | null };

export function windowOf(win: Win): Bounds {
  const to = new Date();
  const d = DAYS[win];
  if (d == null) return { from: null, to, prev: null };
  const ms = d * 86_400_000;
  const from = new Date(to.getTime() - ms);
  return { from, to, prev: { from: new Date(from.getTime() - ms), to: from } };
}

/** `from` is null for all-time, and the SQL below is written to accept that. */
const P = (b: { from: Date | null; to: Date }) => [b.from, b.to];

export function parseWin(v: string | undefined): Win {
  return (WINDOWS.find((w) => w.key === v)?.key ?? '7d') as Win;
}

// ── site-wide ────────────────────────────────────────────────────────────────────────────────────

export type SiteStats = {
  // what locals did (place_signals: real, timestamped, full history)
  worthIt: number; itsFine: number; skipIt: number; beenHere: number; wantToGo: number;
  signalTotal: number;
  tappers: number; // distinct devices that tapped anything. NOT "visitors": see the note below.
  // the Local Passport
  pulls: number; pullers: number; stamped: number;
  // what people contributed
  reviews: number; tips: number; photos: number; claims: number;
  // the business
  subscribers: number; confirmedSubs: number;
  perksLive: number; guidePerks: number;
  verifiedOwners: number; spotsAdded: number;
};

const ZERO_SITE: SiteStats = {
  worthIt: 0, itsFine: 0, skipIt: 0, beenHere: 0, wantToGo: 0, signalTotal: 0, tappers: 0,
  pulls: 0, pullers: 0, stamped: 0, reviews: 0, tips: 0, photos: 0, claims: 0,
  subscribers: 0, confirmedSubs: 0, perksLive: 0, guidePerks: 0, verifiedOwners: 0, spotsAdded: 0,
};

export async function siteStats(win: Win): Promise<SiteStats> {
  const b = windowOf(win);
  const [sig, stamp, contrib, biz] = await Promise.all([
    pool.query(
      `select
         count(*) filter (where signal_type='verdict' and verdict='worth_it')::int as worth_it,
         count(*) filter (where signal_type='verdict' and verdict='its_fine')::int as its_fine,
         count(*) filter (where signal_type='verdict' and verdict='skip_it')::int  as skip_it,
         count(*) filter (where signal_type='been_here')::int                      as been_here,
         count(*) filter (where signal_type='want_to_go')::int                     as want_to_go,
         count(*)::int                                                             as total,
         count(distinct anon_id)::int                                              as tappers
       from place_signals
       where ($1::timestamptz is null or created_at >= $1) and created_at < $2`, P(b)),
    pool.query(
      `select
         count(*) filter (where event_type='pull')::int                          as pulls,
         count(distinct visitor_token) filter (where event_type='pull')::int      as pullers,
         count(*) filter (where event_type='redeem')::int                         as stamped
       from passport_stamp_events
       where ($1::timestamptz is null or occurred_at >= $1) and occurred_at < $2`, P(b)),
    pool.query(
      `select
         (select count(*) from reviews where status='approved' and ($1::timestamptz is null or created_at >= $1) and created_at < $2)::int as reviews,
         (select count(*) from tips    where status='approved' and ($1::timestamptz is null or created_at >= $1) and created_at < $2)::int as tips,
         (select count(*) from photos  where status='approved' and ($1::timestamptz is null or created_at >= $1) and created_at < $2)::int as photos,
         (select count(*) from claims  where status='verified' and ($1::timestamptz is null or created_at >= $1) and created_at < $2)::int as claims`, P(b)),
    pool.query(
      `select
         (select count(*) from subscribers where ($1::timestamptz is null or created_at >= $1) and created_at < $2)::int as subs,
         (select count(*) from subscribers where status='confirmed' and ($1::timestamptz is null or created_at >= $1) and created_at < $2)::int as confirmed,
         (select count(*) from specials where status='active')::int                                   as perks_live,
         (select count(*) from specials where status='active' and issuer_type='guide')::int           as guide_perks,
         (select count(distinct place_id) from claims where status='verified')::int                   as owners,
         (select count(*) from restaurants where not hidden and ($1::timestamptz is null or created_at >= $1) and created_at < $2)::int as spots_added`, P(b)),
  ]);

  const s = sig.rows[0], p = stamp.rows[0], c = contrib.rows[0], z = biz.rows[0];
  return {
    ...ZERO_SITE,
    worthIt: s.worth_it, itsFine: s.its_fine, skipIt: s.skip_it,
    beenHere: s.been_here, wantToGo: s.want_to_go,
    signalTotal: s.total, tappers: s.tappers,
    pulls: p.pulls, pullers: p.pullers, stamped: p.stamped,
    reviews: c.reviews, tips: c.tips, photos: c.photos, claims: c.claims,
    subscribers: z.subs, confirmedSubs: z.confirmed,
    perksLive: z.perks_live, guidePerks: z.guide_perks,
    verifiedOwners: z.owners, spotsAdded: z.spots_added,
  };
}

/** The previous, equal-length window. Same function, different bounds: no separate delta code path. */
export async function siteStatsPrev(win: Win): Promise<SiteStats | null> {
  const b = windowOf(win);
  if (!b.prev) return null;
  const saved = b.prev;
  const [sig, stamp] = await Promise.all([
    pool.query(
      `select count(*)::int as total, count(distinct anon_id)::int as tappers
       from place_signals where created_at >= $1 and created_at < $2`, [saved.from, saved.to]),
    pool.query(
      `select count(*) filter (where event_type='pull')::int as pulls,
              count(*) filter (where event_type='redeem')::int as stamped
       from passport_stamp_events where occurred_at >= $1 and occurred_at < $2`, [saved.from, saved.to]),
  ]);
  return { ...ZERO_SITE, signalTotal: sig.rows[0].total, tappers: sig.rows[0].tappers, pulls: stamp.rows[0].pulls, stamped: stamp.rows[0].stamped };
}

// ── the spots people are actually engaging with ──────────────────────────────────────────────────

export type Mover = { slug: string; name: string; signals: number; beenHere: number; wantToGo: number };

/**
 * Ranked by taps, not views, because views do not exist yet. No minimum threshold here (unlike the
 * owner desk) because this is admin-only: Anthony is allowed to look at n=1, he just should not
 * SHOW n=1 to anybody.
 */
export async function topSpots(win: Win, limit = 12): Promise<Mover[]> {
  const b = windowOf(win);
  const { rows } = await pool.query(
    `select r.slug, r.name,
            count(*)::int                                       as signals,
            count(*) filter (where s.signal_type='been_here')::int  as been_here,
            count(*) filter (where s.signal_type='want_to_go')::int as want_to_go
       from place_signals s
       left join restaurants r on r.id = s.place_id
      where ($1::timestamptz is null or s.created_at >= $1) and s.created_at < $2
        and r.slug is not null
      group by 1,2
      order by signals desc, r.name
      limit $3`, [...P(b), limit]);
  return rows.map((r) => ({ slug: r.slug, name: r.name, signals: r.signals, beenHere: r.been_here, wantToGo: r.want_to_go }));
}

/** Newsletter signups credited to a specific restaurant's page. Nobody had noticed this was here. */
export async function subscribersBySource(limit = 10): Promise<{ source: string; n: number }[]> {
  const { rows } = await pool.query(
    `select coalesce(nullif(source,''), 'unknown') as source, count(*)::int as n
       from subscribers group by 1 order by n desc, source limit $1`, [limit]);
  return rows;
}

/** What is sitting in the moderation queue right now. Not a timeframe question. */
export async function pendingQueue(): Promise<{ photos: number; tips: number; reviews: number; claims: number; events: number }> {
  const { rows } = await pool.query(
    `select (select count(*) from photos  where status='pending')::int as photos,
            (select count(*) from tips    where status='pending')::int as tips,
            (select count(*) from reviews where status='pending')::int as reviews,
            (select count(*) from claims  where status='pending')::int as claims,
            (select count(*) from events  where status='pending')::int as events`);
  return rows[0];
}

/**
 * Bot contamination audit for the Passport log.
 *
 * /ticket/[id] carries robots noindex in its metadata, but robots.txt did not disallow it, so a
 * crawler had to RENDER the page to discover the noindex, and rendering it mounts <StampPull>.
 * Googlebot executes JavaScript and does not persist cookies between page loads, so each render
 * would mint a brand new llg_anon and log a phantom "distinct person" pulling a stamp. That is the
 * exact number the sales pitch is built on.
 *
 * robots.ts now disallows /ticket/, but any history recorded before that is suspect. A high share of
 * tokens with exactly ONE event is the cookieless-crawler signature. Surface it rather than quietly
 * trusting the number.
 */
export async function stampAudit(): Promise<{ tokens: number; singleUse: number; pct: number }> {
  const { rows } = await pool.query(
    `select count(*)::int as tokens, count(*) filter (where n = 1)::int as single_use
       from (select visitor_token, count(*) n from passport_stamp_events
              where event_type='pull' group by 1) t`);
  const { tokens, single_use: singleUse } = rows[0];
  return { tokens, singleUse, pct: tokens ? Math.round((singleUse / tokens) * 100) : 0 };
}

// ── one spot (used by admin now, and by the owner desk in phase 3) ───────────────────────────────

export type SpotStats = {
  worthIt: number; itsFine: number; skipIt: number; beenHere: number; wantToGo: number;
  pulls: number; stamped: number;
  reviews: number; photos: number; tips: number;
  subscribersFromPage: number;
};

export async function spotStats(placeId: string, slug: string, win: Win): Promise<SpotStats> {
  const b = windowOf(win);
  const [sig, stamp, contrib] = await Promise.all([
    pool.query(
      `select count(*) filter (where signal_type='verdict' and verdict='worth_it')::int as worth_it,
              count(*) filter (where signal_type='verdict' and verdict='its_fine')::int as its_fine,
              count(*) filter (where signal_type='verdict' and verdict='skip_it')::int  as skip_it,
              count(*) filter (where signal_type='been_here')::int                      as been_here,
              count(*) filter (where signal_type='want_to_go')::int                     as want_to_go
         from place_signals
        where place_id = $3 and ($1::timestamptz is null or created_at >= $1) and created_at < $2`, [...P(b), placeId]),
    pool.query(
      `select count(*) filter (where event_type='pull')::int   as pulls,
              count(*) filter (where event_type='redeem')::int as stamped
         from passport_stamp_events
        where place_id = $3 and ($1::timestamptz is null or occurred_at >= $1) and occurred_at < $2`, [...P(b), placeId]),
    pool.query(
      `select (select count(*) from reviews where place_id=$3 and status='approved' and ($1::timestamptz is null or created_at >= $1) and created_at < $2)::int as reviews,
              (select count(*) from photos  where place_id=$3 and status='approved' and ($1::timestamptz is null or created_at >= $1) and created_at < $2)::int as photos,
              (select count(*) from tips    where place_id=$3 and status='approved' and ($1::timestamptz is null or created_at >= $1) and created_at < $2)::int as tips,
              -- Google can never tell an owner this: locals who joined the guide's list FROM their page.
              (select count(*) from subscribers where source = 'spot:' || $4)::int as subs_from_page`,
      [...P(b), placeId, slug]),
  ]);
  const s = sig.rows[0], p = stamp.rows[0], c = contrib.rows[0];
  return {
    worthIt: s.worth_it, itsFine: s.its_fine, skipIt: s.skip_it, beenHere: s.been_here, wantToGo: s.want_to_go,
    pulls: p.pulls, stamped: p.stamped,
    reviews: c.reviews, photos: c.photos, tips: c.tips,
    subscribersFromPage: c.subs_from_page,
  };
}
