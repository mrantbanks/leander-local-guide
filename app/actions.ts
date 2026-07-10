'use server';

import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { isVerifiedOwner } from '@/lib/spots';
import { consumeClaim, saveOwnerContent, type OwnerContent } from '@/lib/owner';
import { createSpecial, removeSpecial, specialOwnerSlug, type SpecialInput } from '@/lib/specials';

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
  if (!(await requireAdmin())) return;
  const ed = {
    hook: clean(fd.get('hook')),
    verdict: String(fd.get('verdict') || 'WORTH IT'),
    review: clean(fd.get('review')),
    whatToOrder: clean(fd.get('whatToOrder')),
    gotcha: clean(fd.get('gotcha')),
    badges: String(fd.get('badges') || '').split(',').map((s) => s.trim()).filter(Boolean),
    openingStatus: String(fd.get('openingStatus') || ''),
    openingNote: clean(fd.get('openingNote')),
    summaryNote: clean(fd.get('summaryNote')),
    cantWait: clean(fd.get('cantWait')),
    visited: fd.get('visited') === 'on',
    visitedDate: String(fd.get('visitedDate') || ''),
    source: 'editorial',
    edited: '2026-06-24',
  };
  const hh = clean(fd.get('happyHour'));
  const norm = (v: FormDataEntryValue | null) => { const s = String(v || '').trim(); return s ? (/^https?:\/\//i.test(s) ? s : 'https://' + s) : null; };
  const menuUrl = norm(fd.get('menuUrl'));
  const orderUrl = norm(fd.get('orderUrl'));
  const hidden = fd.get('hidden') === 'on';
  const category = String(fd.get('category') || '').trim(); // venue type, e.g. Food Truck
  await pool.query(
    `update restaurants set editorial = editorial || $2::jsonb, happy_hour = $3,
       attributes = coalesce(attributes,'{}'::jsonb) || jsonb_build_object('menuUrl', $4::text, 'orderUrl', $5::text),
       hidden = $6, primary_category = coalesce(nullif($7,''), primary_category), updated_at = now() where slug = $1`,
    [slug, JSON.stringify(ed), hh, menuUrl, orderUrl, hidden, category]
  );
  for (const p of ['/', '/map', '/best', '/new', `/r/${slug}`, '/admin', '/admin/spots']) revalidatePath(p);
  redirect('/admin');
}

// Admin: hide/show a listing (closed, or coming-soon and not established yet). Hidden = gone from
// the whole public site (directory, map, search, detail page, gems, fresh ink, counts).
export async function setHidden(slug: string, hidden: boolean) {
  if (!(await requireAdmin())) return;
  await pool.query('update restaurants set hidden = $2, updated_at = now() where slug = $1', [slug, hidden]);
  for (const p of ['/', '/map', '/best', '/new', `/r/${slug}`, '/admin/spots']) revalidatePath(p);
}

// Admin: delete an uploaded photo.
export async function deletePhoto(id: number, slug: string) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return;
  await pool.query('delete from photos where id = $1', [id]);
  revalidatePath(`/r/${slug}`);
  revalidatePath(`/admin/r/${slug}`);
}

export async function setPhotoCaption(id: number, slug: string, caption: string) {
  if (!(await requireAdmin())) return;
  await pool.query('update photos set caption = $2 where id = $1', [id, caption.trim() || null]);
  revalidatePath(`/r/${slug}`);
}

// Admin: save the structured menu (hand-edited or AI-extracted). Validates shape; null sections clears it.
export async function saveMenu(slug: string, json: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: 'forbidden' };
  let menu: { sections?: unknown; note?: unknown } | null = null;
  try { menu = JSON.parse(json); } catch { return { ok: false, error: 'That is not valid JSON' }; }
  const sections = Array.isArray(menu?.sections) ? menu?.sections as { name?: unknown; items?: unknown }[] : [];
  if (!sections.length) return { ok: false, error: 'Menu needs at least one section with items ({"sections":[...]})' };
  for (const s of sections) {
    if (!s || typeof s.name !== 'string' || !s.name.trim()) return { ok: false, error: 'Every section needs a "name"' };
    if (!Array.isArray(s.items) || !s.items.length) return { ok: false, error: `Section "${s.name}" has no items` };
    for (const it of s.items as { name?: unknown }[]) {
      if (!it || typeof it.name !== 'string' || !it.name.trim()) return { ok: false, error: `An item in "${s.name}" is missing its "name"` };
    }
  }
  const stripped = JSON.stringify(menu).replace(/[ \t]*[—–][ \t]*/g, ', ').replace(/[—–]/g, '-'); // house rule
  await pool.query('update restaurants set menu = $2::jsonb, updated_at = now() where slug = $1', [slug, stripped]);
  for (const p of [`/r/${slug}`, `/r/${slug}/menu`, `/admin/r/${slug}`]) revalidatePath(p);
  return { ok: true };
}

export async function deleteMenu(slug: string) {
  if (!(await requireAdmin())) return;
  await pool.query('update restaurants set menu = null, updated_at = now() where slug = $1', [slug]);
  for (const p of [`/r/${slug}`, `/r/${slug}/menu`, `/admin/r/${slug}`]) revalidatePath(p);
}

// Mark/unmark a photo as a menu (shown in its own zoomable Menu section, kept out of the food gallery).
export async function setPhotoMenu(id: number, slug: string, isMenu: boolean) {
  if (!(await requireAdmin())) return;
  await pool.query('update photos set is_menu = $2 where id = $1', [id, isMenu]);
  revalidatePath(`/r/${slug}`);
  revalidatePath('/');
}

// Toggle a local photo as THE header (overrides the Google image). Off = Google image is header.
export async function setHeaderPhoto(id: number, slug: string) {
  if (!(await requireAdmin())) return;
  const cur = await pool.query('select is_header from photos where id = $1', [id]);
  if (cur.rows[0]?.is_header) {
    await pool.query('update photos set is_header = false where id = $1', [id]); // revert to Google
  } else {
    await pool.query('update photos set is_header = (id = $1) where place_id = (select id from restaurants where slug = $2)', [id, slug]);
  }
  revalidatePath(`/r/${slug}`); revalidatePath(`/admin/r/${slug}`); revalidatePath('/');
}

// Persist a new photo order (drag-to-reorder in the studio).
export async function reorderPhotos(slug: string, ids: number[]) {
  if (!(await requireAdmin())) return;
  for (let i = 0; i < ids.length; i++) await pool.query('update photos set sort = $2 where id = $1', [ids[i], i]);
  revalidatePath(`/r/${slug}`); revalidatePath(`/admin/r/${slug}`); revalidatePath('/');
}

async function requireAdmin() {
  const session = await auth();
  return !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
}

// Admin: map each AI task to an engine (gemini / claude / remote workers).
export async function setAiConfig(fd: FormData) {
  if (!(await requireAdmin())) return;
  const { TASKS, setProvider } = await import('@/lib/ai/router');
  for (const t of TASKS) {
    const v = String(fd.get(t.task) || '');
    if (t.allow.includes(v as never)) await setProvider(t.task, v);
  }
  revalidatePath('/admin/ai');
  redirect('/admin/ai');
}

// Moderation: approve / reject a pending user photo.
export async function approvePhoto(id: number) {
  if (!(await requireAdmin())) return;
  await pool.query("update photos set status = 'approved' where id = $1", [id]);
  revalidatePath('/admin/moderation');
}
export async function rejectPhoto(id: number) {
  if (!(await requireAdmin())) return;
  await pool.query("update photos set status = 'removed' where id = $1", [id]);
  revalidatePath('/admin/moderation');
}

// Moderation: approve / reject a pending user tip or review (used by the moderation page AND the
// inline one-click buttons on the workers panel). Refreshes the spot page + both admin views.
async function revalidateModeration(table: 'tips' | 'reviews', id: number) {
  const { rows } = await pool.query(`select r.slug from ${table} s join restaurants r on r.id = s.place_id where s.id = $1`, [id]);
  if (rows[0]?.slug) revalidatePath(`/r/${rows[0].slug}`);
  revalidatePath('/admin/moderation'); revalidatePath('/admin/workers');
}
export async function approveTip(id: number) {
  if (!(await requireAdmin())) return;
  await pool.query("update tips set status = 'approved' where id = $1", [id]);
  await revalidateModeration('tips', id);
}
export async function rejectTip(id: number) {
  if (!(await requireAdmin())) return;
  await pool.query("update tips set status = 'removed' where id = $1", [id]);
  await revalidateModeration('tips', id);
}
export async function approveReview(id: number) {
  if (!(await requireAdmin())) return;
  await pool.query("update reviews set status = 'approved' where id = $1", [id]);
  await revalidateModeration('reviews', id);
}
export async function rejectReview(id: number) {
  if (!(await requireAdmin())) return;
  await pool.query("update reviews set status = 'removed' where id = $1", [id]);
  await revalidateModeration('reviews', id);
}

// Owner claims: verify (grants owner-response rights) / reject.
export async function verifyClaim(id: number) {
  if (!(await requireAdmin())) return;
  await pool.query("update claims set status = 'verified' where id = $1", [id]);
  revalidatePath('/admin/moderation');
}
export async function rejectClaim(id: number) {
  if (!(await requireAdmin())) return;
  await pool.query("update claims set status = 'rejected' where id = $1", [id]);
  revalidatePath('/admin/moderation');
}

// Events: admin add / delete + moderation approve / reject.
export async function addEvent(slug: string, fd: FormData) {
  if (!(await requireAdmin())) return;
  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return;
  const title = String(fd.get('title') || '').trim().replace(/[—–]/g, '-').slice(0, 120);
  if (!title) return;
  const type = String(fd.get('event_type') || 'other');
  const freq = String(fd.get('freq') || 'weekly');
  const days = fd.getAll('dow').map((d) => parseInt(String(d), 10)).filter((n) => n >= 1 && n <= 7);
  const time = String(fd.get('start_time') || '') || null;
  const desc = String(fd.get('description') || '').trim().replace(/[—–]/g, '-').slice(0, 500) || null;
  await pool.query(
    `insert into events (place_id, event_type, title, description, freq, days_of_week, start_time, source, status, verified, last_confirmed_at)
     values ($1,$2,$3,$4,$5,$6,$7,'admin','approved',true,now())`,
    [rows[0].id, type, title, desc, freq, days.length ? days : null, time]
  );
  revalidatePath(`/r/${slug}`);
  revalidatePath('/whats-on');
}
export async function deleteEvent(id: number, slug: string) {
  if (!(await requireAdmin())) return;
  await pool.query('delete from events where id = $1', [id]);
  revalidatePath(`/r/${slug}`);
  revalidatePath('/whats-on');
}
export async function approveEvent(id: number) {
  if (!(await requireAdmin())) return;
  await pool.query("update events set status = 'approved', verified = true, last_confirmed_at = now(), expires_at = null where id = $1", [id]);
  revalidatePath('/admin/moderation');
  revalidatePath('/whats-on');
}
export async function rejectEvent(id: number) {
  if (!(await requireAdmin())) return;
  await pool.query("update events set status = 'removed' where id = $1", [id]);
  revalidatePath('/admin/moderation');
}

// ---- Owner claim + management (any signed-in user; ownership checked per-place) ----
export async function claimRestaurant(tokenId: number): Promise<{ ok: boolean; slug?: string; reason?: string }> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { ok: false, reason: 'Please sign in first.' };
  const res = await consumeClaim(tokenId, email);
  if (res.ok && res.slug) revalidatePath(`/r/${res.slug}`);
  return res;
}

export async function saveOwnerEdits(slug: string, patch: OwnerContent): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !(await isVerifiedOwner(slug, email))) return { ok: false, error: 'Not authorized' };
  // Only ever writes owner_content. Never touches editorial (Anthony's) or attributes (admin's).
  const safe: OwnerContent = {};
  for (const k of ['phone', 'website', 'menuUrl', 'orderUrl', 'happyHour', 'blurb'] as const) {
    if (k in patch) safe[k] = clean(patch[k] as string) ?? undefined;
  }
  if (Array.isArray(patch.hours) && patch.hours.length === 7) {
    safe.hours = patch.hours.map((d) => (d && d.open && d.close) ? { open: String(d.open), close: String(d.close) } : null);
  }
  await saveOwnerContent(slug, safe, email);
  revalidatePath(`/r/${slug}`);
  revalidatePath(`/owner/${slug}`);
  return { ok: true };
}

// The Local Passport — owner-created, honor-based perks.
export async function createSpecialAction(slug: string, input: SpecialInput): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !(await isVerifiedOwner(slug, email))) return { ok: false, error: 'Not authorized' };
  const title = clean(input.title);
  if (!title) return { ok: false, error: 'Add the deal' };
  await createSpecial(slug, email, {
    title, details: clean(input.details ?? null), recurring: !!input.recurring,
    daysOfWeek: Array.isArray(input.daysOfWeek) ? input.daysOfWeek.filter((n) => n >= 0 && n <= 6) : null,
    endsOn: input.endsOn || null,
  });
  revalidatePath(`/r/${slug}`);
  revalidatePath(`/owner/${slug}`);
  return { ok: true };
}

export async function removeSpecialAction(id: number): Promise<{ ok: boolean }> {
  const session = await auth();
  const email = session?.user?.email;
  const slug = await specialOwnerSlug(id);
  if (!email || !slug || !(await isVerifiedOwner(slug, email))) return { ok: false };
  await removeSpecial(id);
  revalidatePath(`/r/${slug}`);
  revalidatePath(`/owner/${slug}`);
  return { ok: true };
}
