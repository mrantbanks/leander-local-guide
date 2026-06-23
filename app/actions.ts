'use server';

import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { pool } from '@/lib/db';

const COUNTER: Record<string, string> = {
  worth_it: 'worth_it_ct', its_fine: 'its_fine_ct', skip_it: 'skip_it_ct',
  been_here: 'been_here_ct', want_to_go: 'want_to_go_ct',
};

type Counts = { worth_it_ct: number; its_fine_ct: number; skip_it_ct: number; been_here_ct: number; want_to_go_ct: number };

// Anonymous one-tap signal (verdict / been-here / want-to-go). Deduped per device.
export async function recordSignal(
  placeId: string,
  type: 'verdict' | 'been_here' | 'want_to_go',
  verdict?: 'worth_it' | 'its_fine' | 'skip_it'
): Promise<Counts | null> {
  const jar = await cookies();
  let anon = jar.get('llg_anon')?.value;
  if (!anon) {
    anon = randomUUID();
    jar.set('llg_anon', anon, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
  }
  const col = type === 'verdict' ? COUNTER[verdict || ''] : COUNTER[type];
  if (!col) return null;
  const ins = await pool.query(
    `insert into place_signals (place_id, signal_type, verdict, anon_id) values ($1,$2,$3,$4)
     on conflict (place_id, signal_type, coalesce(user_id::text, anon_id::text)) do nothing`,
    [placeId, type, type === 'verdict' ? verdict : null, anon]
  );
  if (ins.rowCount && ins.rowCount > 0) {
    await pool.query(`update restaurants set ${col} = ${col} + 1 where id = $1`, [placeId]);
  }
  const { rows } = await pool.query(
    `select worth_it_ct, its_fine_ct, skip_it_ct, been_here_ct, want_to_go_ct from restaurants where id = $1`,
    [placeId]
  );
  return rows[0] || null;
}

// House rule: no em/en dashes on stored content either.
function clean(s: FormDataEntryValue | null): string | null {
  if (s == null) return null;
  const v = String(s).replace(/[ \t]*[—–][ \t]*/g, ', ').replace(/[—–]/g, '-').trim();
  return v.length ? v : null;
}

// Admin: edit Anthony's review for a spot.
export async function updateReview(slug: string, fd: FormData) {
  const ed = {
    hook: clean(fd.get('hook')),
    verdict: String(fd.get('verdict') || 'WORTH IT'),
    review: clean(fd.get('review')),
    whatToOrder: clean(fd.get('whatToOrder')),
    gotcha: clean(fd.get('gotcha')),
    visited: fd.get('visited') === 'on',
    source: 'editorial',
    edited: '2026-06-23',
  };
  const hh = clean(fd.get('happyHour'));
  await pool.query('update restaurants set editorial = editorial || $2::jsonb, happy_hour = $3, updated_at = now() where slug = $1', [
    slug, JSON.stringify(ed), hh,
  ]);
  revalidatePath(`/r/${slug}`);
  revalidatePath('/admin');
  redirect('/admin');
}

// Admin: delete an uploaded photo.
export async function deletePhoto(id: number, slug: string) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return;
  await pool.query('delete from photos where id = $1', [id]);
  revalidatePath(`/r/${slug}`);
  revalidatePath(`/admin/r/${slug}`);
}
