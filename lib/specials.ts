import { pool } from '@/lib/db';
import type { Special } from '@/lib/specials-format';
export type { Special } from '@/lib/specials-format';
export { scheduleLabel } from '@/lib/specials-format';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(r: any): Special {
  return { id: r.id, slug: r.slug, restaurant: r.name && (r.name as string), category: r.cat, title: r.title, details: r.details, recurring: r.recurring, daysOfWeek: r.days_of_week, startsOn: r.starts_on, endsOn: r.ends_on };
}

// every live deal in town, for the round-up page
export async function getAllActiveSpecials(): Promise<Special[]> {
  const { rows } = await pool.query(
    `select s.*, r.slug, r.name, r.primary_category cat from specials s join restaurants r on r.id = s.place_id
     where s.status = 'active'
       and (s.starts_on is null or s.starts_on <= current_date)
       and (s.ends_on is null or s.ends_on >= current_date)
     order by r.name`);
  return rows.map(map);
}

export async function getActiveSpecials(slug: string): Promise<Special[]> {
  const { rows } = await pool.query(
    `select s.* from specials s join restaurants r on r.id = s.place_id
     where r.slug = $1 and s.status = 'active'
       and (s.starts_on is null or s.starts_on <= current_date)
       and (s.ends_on is null or s.ends_on >= current_date)
     order by s.created_at desc`, [slug]);
  return rows.map(map);
}

export async function getOwnerSpecials(slug: string): Promise<Special[]> {
  const { rows } = await pool.query(
    `select s.* from specials s join restaurants r on r.id = s.place_id
     where r.slug = $1 and s.status = 'active' order by s.created_at desc`, [slug]);
  return rows.map(map);
}

export async function getSpecial(id: number): Promise<Special | null> {
  const { rows } = await pool.query(
    `select s.*, r.slug, r.name from specials s join restaurants r on r.id = s.place_id where s.id = $1 and s.status = 'active'`, [id]);
  return rows[0] ? map(rows[0]) : null;
}

// place_id of a special (for ownership checks in the action layer)
export async function specialOwnerSlug(id: number): Promise<string | null> {
  const { rows } = await pool.query(`select r.slug from specials s join restaurants r on r.id = s.place_id where s.id = $1`, [id]);
  return rows[0]?.slug || null;
}

export type SpecialInput = { title: string; details?: string | null; recurring: boolean; daysOfWeek?: number[] | null; endsOn?: string | null };
export async function createSpecial(slug: string, email: string, d: SpecialInput): Promise<void> {
  await pool.query(
    `insert into specials (place_id, title, details, recurring, days_of_week, ends_on, created_by)
     values ((select id from restaurants where slug = $1), $2, $3, $4, $5, $6, $7)`,
    [slug, d.title, d.details || null, d.recurring, d.recurring ? (d.daysOfWeek || null) : null, d.endsOn || null, email]);
}
export async function removeSpecial(id: number): Promise<void> {
  await pool.query(`update specials set status = 'removed' where id = $1`, [id]);
}
