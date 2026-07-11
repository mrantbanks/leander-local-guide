import { pool } from '@/lib/db';
import type { Special, IssuerType, RedeemType } from '@/lib/specials-format';
export type { Special } from '@/lib/specials-format';
export { scheduleLabel, issuerLabel, handoffLabel, GUIDE_ISSUER } from '@/lib/specials-format';

// NOTE: every join to restaurants below is a LEFT join, on purpose. A first-party Guide perk has
// place_id = null (sql/009_guide_perks.sql); an inner join would silently drop it from every
// surface on the site, which is exactly the bug that would make the "empty Passport" fix look
// like it did nothing.
const JOIN = 'from specials s left join restaurants r on r.id = s.place_id';
const LIVE = `s.status = 'active'
  and (s.starts_on is null or s.starts_on <= current_date)
  and (s.ends_on is null or s.ends_on >= current_date)`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(r: any): Special {
  return {
    // specials.id is bigserial, and node-pg hands int8 back as a STRING to protect precision.
    // Coerce here so Special.id is genuinely a number, as its type has always claimed. Without
    // this, anything doing arithmetic or a Number.isInteger check on it silently misbehaves.
    id: Number(r.id), slug: r.slug || undefined, restaurant: r.name || undefined, category: r.cat || undefined,
    title: r.title, details: r.details, recurring: r.recurring, daysOfWeek: r.days_of_week,
    startsOn: r.starts_on, endsOn: r.ends_on,
    issuerType: (r.issuer_type || 'business') as IssuerType,
    redeemType: (r.redeem_type || 'counter') as RedeemType,
  };
}

const COLS = 's.*, r.slug, r.name, r.primary_category cat';

// every live perk in town, for the round-up page. Guide perks sort first: they are ours, they are
// always on, and a page that opens with a live perk does not look dead.
export async function getAllActiveSpecials(): Promise<Special[]> {
  const { rows } = await pool.query(
    `select ${COLS} ${JOIN} where ${LIVE}
     order by (s.issuer_type = 'guide') desc, r.name nulls first, s.created_at desc`);
  return rows.map(map);
}

export async function getActiveSpecials(slug: string): Promise<Special[]> {
  const { rows } = await pool.query(
    `select ${COLS} ${JOIN} where r.slug = $1 and ${LIVE} order by s.created_at desc`, [slug]);
  return rows.map(map);
}

export async function getOwnerSpecials(slug: string): Promise<Special[]> {
  const { rows } = await pool.query(
    `select ${COLS} ${JOIN} where r.slug = $1 and s.status = 'active' order by s.created_at desc`, [slug]);
  return rows.map(map);
}

export async function getSpecial(id: number): Promise<Special | null> {
  const { rows } = await pool.query(`select ${COLS} ${JOIN} where s.id = $1 and s.status = 'active'`, [id]);
  return rows[0] ? map(rows[0]) : null;
}

// Every Guide-issued perk, live or not, for the admin desk.
export async function getGuideSpecials(): Promise<Special[]> {
  const { rows } = await pool.query(
    `select ${COLS} ${JOIN} where s.issuer_type = 'guide' and s.status = 'active' order by s.created_at desc`);
  return rows.map(map);
}

// place_id of a special (for ownership checks in the action layer).
// Returns null for a Guide perk, which has no owner: callers must not treat that as "any owner".
export async function specialOwnerSlug(id: number): Promise<string | null> {
  const { rows } = await pool.query(
    `select r.slug ${JOIN} where s.id = $1 and s.issuer_type = 'business'`, [id]);
  return rows[0]?.slug || null;
}

export type SpecialInput = { title: string; details?: string | null; recurring: boolean; daysOfWeek?: number[] | null; endsOn?: string | null };

export async function createSpecial(slug: string, email: string, d: SpecialInput): Promise<void> {
  await pool.query(
    `insert into specials (place_id, title, details, recurring, days_of_week, ends_on, created_by, issuer_type, redeem_type)
     values ((select id from restaurants where slug = $1), $2, $3, $4, $5, $6, $7, 'business', 'counter')`,
    [slug, d.title, d.details || null, d.recurring, d.recurring ? (d.daysOfWeek || null) : null, d.endsOn || null, email]);
}

export type GuideSpecialInput = SpecialInput & { redeemType: RedeemType };

// A perk the Guide funds and honors itself. No business_id, so it needs no owner's consent and
// can go live today.
export async function createGuideSpecial(email: string, d: GuideSpecialInput): Promise<void> {
  await pool.query(
    `insert into specials (place_id, title, details, recurring, days_of_week, ends_on, created_by, issuer_type, redeem_type)
     values (null, $1, $2, $3, $4, $5, $6, 'guide', $7)`,
    [d.title, d.details || null, d.recurring, d.recurring ? (d.daysOfWeek || null) : null, d.endsOn || null, email, d.redeemType]);
}

export async function removeSpecial(id: number): Promise<void> {
  await pool.query(`update specials set status = 'removed' where id = $1`, [id]);
}
