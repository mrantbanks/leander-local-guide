'use server';

import { cookies } from 'next/headers';
import { randomUUID, createHash } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { isVerifiedOwner } from '@/lib/spots';
import { consumeClaim, saveOwnerContent, canManage, type OwnerContent } from '@/lib/owner';
import { createSpecial, createGuideSpecial, removeSpecial, specialOwnerSlug, type SpecialInput, type GuideSpecialInput } from '@/lib/specials';
import { revalidateSpot, revalidateSpotByPlaceId, revalidateSpotByRow } from '@/lib/revalidate';
import { rateLimit, clientIp } from '@/lib/ratelimit';
import { safeUrl } from '@/lib/urls';
import { AMENITY_TAGS, MEAL_TAGS, FACILITY_TAGS, CHAIN_STATUS, ownershipOf } from '@/lib/tags';
import { validateEvent, type EventInput } from '@/lib/eventInput';
import { EVENT_TYPES } from '@/lib/eventLabels';

const COUNTER: Record<string, string> = {
  worth_it: 'worth_it_ct', its_fine: 'its_fine_ct', skip_it: 'skip_it_ct',
  been_here: 'been_here_ct', want_to_go: 'want_to_go_ct',
};

type Counts = { worth_it_ct: number; its_fine_ct: number; skip_it_ct: number; been_here_ct: number; want_to_go_ct: number };

/**
 * The anonymous per-device id. A random UUID in an httpOnly cookie: never an account, never
 * joined to email/name/IP. It exists only to tell "63 distinct locals" apart from "3 people
 * tapping 21 times". Minted lazily on first use, so anything that needs it must call this
 * rather than read the cookie directly (a visitor who lands straight on /passport has none yet).
 */
async function anonId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get('llg_anon')?.value;
  if (existing) return existing;
  const anon = randomUUID();
  jar.set('llg_anon', anon, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
  return anon;
}

// Anonymous one-tap signal (verdict / been-here / want-to-go). Deduped per device.
export async function recordSignal(
  placeId: string,
  type: 'verdict' | 'been_here' | 'want_to_go',
  verdict?: 'worth_it' | 'its_fine' | 'skip_it'
): Promise<Counts | null> {
  const anon = await anonId();
  const col = type === 'verdict' ? COUNTER[verdict || ''] : COUNTER[type];
  if (!col) return null;

  // The per-device dedupe below is an honesty mechanism, not a security one: the llg_anon cookie
  // belongs to the caller, so anybody willing to drop it can vote again, and these counters decide
  // the Hidden Gems board and the "63 locals weighed in" line. Cap the origin as well, so stuffing
  // the ballot costs more than a loop. A real household behind one NAT will not notice 60/hour.
  if (!rateLimit(`signal:${await clientIp()}`, 60, 60 * 60 * 1000).ok) {
    const { rows } = await pool.query(
      `select worth_it_ct, its_fine_ct, skip_it_ct, been_here_ct, want_to_go_ct from restaurants where id = $1`,
      [placeId]
    );
    return rows[0] || null; // show them the real tally; just don't count this tap
  }
  const ins = await pool.query(
    `insert into place_signals (place_id, signal_type, verdict, anon_id) values ($1,$2,$3,$4)
     on conflict (place_id, signal_type, coalesce(user_id::text, anon_id::text)) do nothing`,
    [placeId, type, type === 'verdict' ? verdict : null, anon]
  );
  if (ins.rowCount && ins.rowCount > 0) {
    await pool.query(`update restaurants set ${col} = ${col} + 1 where id = $1`, [placeId]);
    // The tapper sees their own vote immediately (SignalBar uses the counts we return below), but
    // the cached page would keep serving the old tally to everybody else. Bust it.
    await revalidateSpotByPlaceId(placeId);
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

  // The tags a diner sees. TagPicker sends the amenity KEYS that are lit, so we write the whole set
  // explicitly: every amenity Google gave us is set true or false, not merged. Merging would mean a
  // toggle could turn a tag ON but never OFF, which is exactly the bug you get from `||` on jsonb.
  //
  // Google is regularly wrong about these (it will swear a taco trailer takes reservations), and
  // Anthony has stood in the room. His toggle wins.
  const lit = new Set(String(fd.get('amenities') || '').split(',').map((s) => s.trim()).filter(Boolean));
  const litMeals = new Set(String(fd.get('meals') || '').split(',').map((s) => s.trim()).filter(Boolean));
  const amenities: Record<string, boolean> = {};
  for (const [key] of AMENITY_TAGS) amenities[key] = lit.has(key);
  for (const [key] of MEAL_TAGS) amenities[key] = litMeals.has(key);
  const litFac = new Set(String(fd.get('facilities') || '').split(',').map((s) => s.trim()).filter(Boolean));
  for (const [key] of FACILITY_TAGS) amenities[key] = litFac.has(key);

  // Ownership writes BOTH chainStatus and chainTier. Writing only chainStatus is what made "Texas
  // Chain" unreachable for the entire life of the site.
  const own = String(fd.get('ownership') || '').trim();
  const OWN = CHAIN_STATUS.find((c) => c.value === own);

  await pool.query(
    `update restaurants set editorial = editorial || $2::jsonb, happy_hour = $3,
       attributes = coalesce(attributes,'{}'::jsonb)
                    || jsonb_build_object('menuUrl', $4::text, 'orderUrl', $5::text)
                    || $8::jsonb
                    || case when $9::text = '' then '{}'::jsonb
                            else jsonb_build_object('chainStatus', $9::text, 'chainTier', $10::text) end,
       hidden = $6, primary_category = coalesce(nullif($7,''), primary_category), updated_at = now()
     where slug = $1`,
    [
      slug, JSON.stringify(ed), hh, menuUrl, orderUrl, hidden, category,
      JSON.stringify(amenities),
      OWN ? OWN.status : '',
      OWN ? OWN.tier : null,
    ]
  );
  revalidateSpot(slug);
  revalidatePath('/admin'); revalidatePath('/admin/spots');
  redirect('/admin');
}

// Admin: hide/show a listing (closed, or coming-soon and not established yet). Hidden = gone from
// the whole public site (directory, map, search, detail page, gems, fresh ink, counts).
export async function setHidden(slug: string, hidden: boolean) {
  if (!(await requireAdmin())) return;
  await pool.query('update restaurants set hidden = $2, updated_at = now() where slug = $1', [slug, hidden]);
  revalidateSpot(slug);
  revalidatePath('/admin/spots');
}

/**
 * Archive a spot. Not a delete: the row carries reader photos, tips, reviews and votes that we cannot
 * get back, so archiving keeps every one of them. It also sets hidden, which is what actually takes it
 * off the public site (every public query already filters `not hidden`).
 *
 * For a place that has closed for good, or was never really a restaurant, or is a duplicate.
 */
export async function archiveSpot(slug: string) {
  if (!(await requireAdmin())) return;
  await pool.query(
    'update restaurants set archived_at = now(), hidden = true, updated_at = now() where slug = $1',
    [slug]
  );
  revalidateSpot(slug);
  revalidatePath('/admin/spots');
  revalidatePath('/admin/spots/archive');
}

/** Back to the working list. Stays hidden: putting it back on the site is a separate, deliberate click. */
export async function restoreSpot(slug: string) {
  if (!(await requireAdmin())) return;
  await pool.query('update restaurants set archived_at = null, updated_at = now() where slug = $1', [slug]);
  revalidateSpot(slug);
  revalidatePath('/admin/spots');
  revalidatePath('/admin/spots/archive');
}

/**
 * Delete a spot and everything hanging off it, for ever. Only from the archive, and only after that
 * screen has told you exactly what is about to go with it.
 *
 * Every foreign key to restaurants except events is NO ACTION, so a bare delete simply fails on the
 * first child row. They go in dependency order, in ONE transaction, on ONE checked-out client: a
 * half-deleted spot with orphaned photos is worse than either outcome. The uploaded image files go
 * too, or we keep paying to store pictures of a restaurant nobody can reach.
 */
export async function deleteSpotForever(slug: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: 'forbidden' };

  const { rows } = await pool.query('select id, archived_at from restaurants where slug = $1', [slug]);
  const spot = rows[0];
  if (!spot) return { ok: false, error: 'No such spot' };
  // The archive is the only door to this. You cannot delete something you have not deliberately taken
  // out of circulation first.
  if (!spot.archived_at) return { ok: false, error: 'Archive it first.' };

  const files = await pool.query('select filename from photos where place_id = $1', [spot.id]);

  const client = await pool.connect();
  try {
    await client.query('begin');
    // passport_stamp_events first: it points at BOTH restaurants and specials.
    await client.query('delete from passport_stamp_events where place_id = $1', [spot.id]);
    await client.query('delete from specials           where place_id = $1', [spot.id]);
    await client.query('delete from owner_responses    where place_id = $1', [spot.id]);
    await client.query('delete from owner_claim_tokens where place_id = $1', [spot.id]);
    await client.query('delete from claims             where place_id = $1', [spot.id]);
    await client.query('delete from photos            where place_id = $1', [spot.id]);
    await client.query('delete from place_signals     where place_id = $1', [spot.id]);
    await client.query('delete from reviews           where place_id = $1', [spot.id]);
    await client.query('delete from tips              where place_id = $1', [spot.id]);
    await client.query('delete from feed_events       where place_id = $1', [spot.id]);
    await client.query('delete from events            where place_id = $1', [spot.id]); // cascades anyway
    await client.query('delete from restaurants       where id = $1', [spot.id]);
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    return { ok: false, error: (e as Error).message };
  } finally {
    client.release();
  }

  // Only once the database says it is gone. Files are unrecoverable, and the row is not worth risking.
  const { deleteUpload } = await import('@/lib/r2');
  for (const f of files.rows) await deleteUpload(f.filename as string).catch(() => {});

  revalidatePath('/admin/spots');
  revalidatePath('/admin/spots/archive');
  return { ok: true };
}

// Admin: delete an uploaded photo.
export async function deletePhoto(id: number, slug: string) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return;
  await pool.query('delete from photos where id = $1', [id]);
  revalidateSpot(slug);
}

export async function setPhotoCaption(id: number, slug: string, caption: string) {
  if (!(await requireAdmin())) return;
  await pool.query('update photos set caption = $2 where id = $1', [id, caption.trim() || null]);
  revalidateSpot(slug);
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
  revalidateSpot(slug);
  return { ok: true };
}

export async function deleteMenu(slug: string) {
  if (!(await requireAdmin())) return;
  await pool.query('update restaurants set menu = null, updated_at = now() where slug = $1', [slug]);
  revalidateSpot(slug);
}

// Admin SEO desk (/admin/seo): per-page search-snippet overrides. Each field is the FULL current
// value from the editor, or empty to clear the override and fall back to the auto-generated snippet
// (lib/seo.ts). Stored under editorial.seo*; a JSON null means "no override" (clean() reads it back
// as null, and snippetTitle/snippetDescription fall through). Dashes are scrubbed here too, so an
// override can never smuggle an em dash past the house rule.
export async function saveSeoOverrides(
  slug: string,
  fields: { seoTitle?: string; seoDescription?: string; seoTitleMenu?: string; seoDescriptionMenu?: string }
): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: 'forbidden' };
  const patch = {
    seoTitle: clean(fields.seoTitle ?? null),
    seoDescription: clean(fields.seoDescription ?? null),
    seoTitleMenu: clean(fields.seoTitleMenu ?? null),
    seoDescriptionMenu: clean(fields.seoDescriptionMenu ?? null),
  };
  await pool.query(
    `update restaurants set editorial = coalesce(editorial,'{}'::jsonb) || $2::jsonb, updated_at = now() where slug = $1`,
    [slug, JSON.stringify(patch)]
  );
  revalidateSpot(slug);
  return { ok: true };
}

// Mark/unmark a photo as a menu (shown in its own zoomable Menu section, kept out of the food gallery).
export async function setPhotoMenu(id: number, slug: string, isMenu: boolean) {
  if (!(await requireAdmin())) return;
  await pool.query('update photos set is_menu = $2 where id = $1', [id, isMenu]);
  revalidateSpot(slug);
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
  revalidateSpot(slug);
}

// Persist a new photo order (drag-to-reorder in the studio).
export async function reorderPhotos(slug: string, ids: number[]) {
  if (!(await requireAdmin())) return;
  for (let i = 0; i < ids.length; i++) await pool.query('update photos set sort = $2 where id = $1', [ids[i], i]);
  revalidateSpot(slug);
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
  await revalidateSpotByRow('photos', id); // the gallery lives on the spot page, not here
  revalidatePath('/admin/moderation');
}
export async function rejectPhoto(id: number) {
  if (!(await requireAdmin())) return;
  await pool.query("update photos set status = 'removed' where id = $1", [id]);
  await revalidateSpotByRow('photos', id);
  revalidatePath('/admin/moderation');
}

// Moderation: approve / reject a pending user tip or review (used by the moderation page AND the
// inline one-click buttons on the workers panel). Refreshes the spot page + both admin views.
async function revalidateModeration(table: 'tips' | 'reviews', id: number) {
  // An approved review changes the page's aggregateRating, so this has to hit every cached
  // surface for the spot, not just /r/<slug>.
  await revalidateSpotByRow(table, id);
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
  await revalidateSpotByRow('claims', id); // unlocks the owner desk + owner content on the page
  revalidatePath('/admin/moderation');
}
export async function rejectClaim(id: number) {
  if (!(await requireAdmin())) return;
  await pool.query("update claims set status = 'rejected' where id = $1", [id]);
  await revalidateSpotByRow('claims', id);
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
  revalidateSpot(slug);
  revalidatePath('/whats-on');
}
/**
 * The one insert for an event, whoever is adding it.
 *
 * Anthony adds these when he is standing in the room, and a verified owner adds their own, and the
 * scraper guesses at them. The scraper's guesses land as `pending` and get verified; a human who is
 * actually there is the authority on their own calendar, so theirs go straight up. `source` records
 * which, so /whats-on can keep flagging the unverified scrapes and only those.
 */
async function insertEvent(placeId: string, e: EventInput, source: 'admin' | 'owner'): Promise<{ ok: boolean; error?: string }> {
  const bad = validateEvent(e);
  if (bad) return { ok: false, error: bad };

  const title = clean(e.title)?.slice(0, 120);
  if (!title) return { ok: false, error: 'Give it a name.' };
  if (!EVENT_TYPES.includes(e.eventType)) return { ok: false, error: 'Unknown kind of event.' };

  const days = (e.daysOfWeek || []).filter((n) => n >= 1 && n <= 7);
  const recurring = e.freq !== 'once';

  await pool.query(
    `insert into events
       (place_id, event_type, title, description, freq, days_of_week, week_of_month, event_date,
        start_time, end_time, ends_on, source, status, verified, confidence, last_confirmed_at)
     values ($1,$2,$3,$4,$5::event_freq,$6,$7,$8,$9,$10,$11,$12::event_source,'approved',true,100,now())`,
    [
      placeId, e.eventType, title, clean(e.description ?? null)?.slice(0, 500) ?? null,
      e.freq,
      recurring && days.length ? days : null,
      e.freq === 'monthly_dow' ? e.weekOfMonth ?? null : null,
      e.freq === 'once' ? e.eventDate ?? null : null,
      e.startTime || null,
      e.endTime || null,
      recurring ? e.endsOn || null : null,
      source,
    ]
  );
  return { ok: true };
}

/** Admin: add an event to any spot. Anthony asks the owner while he is standing there. */
export async function addEventAction(slug: string, input: EventInput): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: 'Not authorized' };
  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return { ok: false, error: 'No such spot' };
  const r = await insertEvent(rows[0].id, input, 'admin');
  if (r.ok) { revalidateSpot(slug); revalidatePath('/whats-on'); }
  return r;
}

/** Owner: add an event to their own spot. They know their own calendar better than any scraper. */
export async function createOwnerEvent(slug: string, input: EventInput): Promise<{ ok: boolean; error?: string }> {
  if (!(await canManage(slug))) return { ok: false, error: 'Not authorized' };
  const { rows } = await pool.query('select id from restaurants where slug = $1', [slug]);
  if (!rows[0]) return { ok: false, error: 'No such spot' };
  const r = await insertEvent(rows[0].id, input, 'owner');
  if (r.ok) { revalidateSpot(slug); revalidatePath('/whats-on'); }
  return r;
}

/** Owner: take one of their own events down. Scoped to their spot, so they cannot touch anyone else's. */
export async function removeOwnerEvent(slug: string, id: number): Promise<{ ok: boolean }> {
  if (!(await canManage(slug))) return { ok: false };
  const r = await pool.query(
    `delete from events where id = $1 and place_id = (select id from restaurants where slug = $2)`,
    [id, slug]
  );
  if (r.rowCount) { revalidateSpot(slug); revalidatePath('/whats-on'); }
  return { ok: !!r.rowCount };
}

export async function deleteEvent(id: number, slug: string) {
  if (!(await requireAdmin())) return;
  await pool.query('delete from events where id = $1', [id]);
  revalidateSpot(slug);
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
/**
 * Take ownership of a listing by presenting the secret from the printed sheet.
 *
 * It takes the SECRET, never a row id. A server action is a public HTTP endpoint whose id ships in
 * a static chunk anybody can download, so "the client already proved it had a valid link by getting
 * this far" is not a thing that is true. The only proof is the secret itself, and it is re-checked
 * here on every call.
 *
 * Rate limited because the printed code is deliberately short (LLG-XXXX, four characters from a
 * 31-letter alphabet is about 900k combinations) so that somebody can read it down a phone line.
 * That is a fine trade for a code you have to type, and a terrible one for a code you can guess a
 * thousand times a second, so the guessing is what we take away.
 */
export async function claimRestaurant(
  secret: { kind: 'token' | 'code'; value: string }
): Promise<{ ok: boolean; slug?: string; reason?: string }> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { ok: false, reason: 'Please sign in first.' };

  if (secret?.kind !== 'token' && secret?.kind !== 'code') return { ok: false, reason: 'Bad claim link.' };
  const value = String(secret.value ?? '').trim().slice(0, 200);
  if (!value) return { ok: false, reason: 'Bad claim link.' };

  // Both the account and the origin are capped: one attacker with one Google account cannot grind,
  // and one host cycling throwaway accounts cannot either.
  const ip = await clientIp();
  const perEmail = rateLimit(`claim:e:${email.toLowerCase()}`, 10, 60 * 60 * 1000);
  const perIp = rateLimit(`claim:i:${ip}`, 20, 60 * 60 * 1000);
  if (!perEmail.ok || !perIp.ok) {
    return { ok: false, reason: 'Too many attempts. Try again in a little while.' };
  }

  const res = await consumeClaim({ kind: secret.kind, value }, email);
  if (res.ok && res.slug) revalidateSpot(res.slug);
  return res;
}

export async function saveOwnerEdits(slug: string, patch: OwnerContent): Promise<{ ok: boolean; error?: string }> {
  const email = await canManage(slug);
  if (!email) return { ok: false, error: 'Not authorized' };
  // Only ever writes owner_content. Never touches editorial (Anthony's) or attributes (admin's).
  const safe: OwnerContent = {};
  for (const k of ['phone', 'happyHour', 'blurb'] as const) {
    if (k in patch) safe[k] = clean(patch[k] as string) ?? undefined;
  }
  // The three link fields render as an href on the public page, and owner_content wins over the
  // Google value (lib/spots.ts), so a stranger who claimed a listing controls where "Website" on
  // that page points. Scheme-check them the way the admin editor always has.
  for (const k of ['website', 'menuUrl', 'orderUrl'] as const) {
    if (!(k in patch)) continue;
    const raw = clean(patch[k] as string);
    if (raw === null) { safe[k] = undefined; continue; } // cleared on purpose
    const url = safeUrl(raw);
    if (!url) return { ok: false, error: `That ${k === 'website' ? 'website' : 'link'} does not look like a web address.` };
    safe[k] = url;
  }
  if (Array.isArray(patch.hours) && patch.hours.length === 7) {
    safe.hours = patch.hours.map((d) => (d && d.open && d.close) ? { open: String(d.open), close: String(d.close) } : null);
  }
  await saveOwnerContent(slug, safe, email);
  revalidateSpot(slug);
  return { ok: true };
}

// The Local Passport — owner-created, honor-based perks.
/**
 * Put a logo on the page, or take it off. Owner or admin.
 *
 * The filename is validated against the uploads we just wrote (a logo- prefix and a uuid), because
 * this takes a filename from the client and an unchecked one would let anybody point their listing at
 * any file in the bucket.
 */
export async function saveOwnerLogo(slug: string, filename: string | null): Promise<{ ok: boolean; error?: string }> {
  const email = await canManage(slug);
  if (!email) return { ok: false, error: 'Not authorized' };

  if (filename !== null && !/^logo-[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(filename)) {
    return { ok: false, error: 'That file does not look right.' };
  }

  await pool.query(
    `update restaurants
        set owner_content = coalesce(owner_content, '{}'::jsonb)
                            || case when $2::text is null then jsonb_build_object('logo', null)
                                    else jsonb_build_object('logo', $2::text) end,
            updated_at = now()
      where slug = $1`,
    [slug, filename]
  );
  revalidateSpot(slug);
  return { ok: true };
}

export async function createSpecialAction(slug: string, input: SpecialInput): Promise<{ ok: boolean; error?: string }> {
  const email = await canManage(slug);
  if (!email) return { ok: false, error: 'Not authorized' };
  const title = clean(input.title);
  if (!title) return { ok: false, error: 'Add the perk' };
  await createSpecial(slug, email, {
    title, details: clean(input.details ?? null), recurring: !!input.recurring,
    daysOfWeek: Array.isArray(input.daysOfWeek) ? input.daysOfWeek.filter((n) => n >= 0 && n <= 6) : null,
    endsOn: input.endsOn || null,
  });
  revalidateSpot(slug);
  return { ok: true };
}

export async function removeSpecialAction(id: number): Promise<{ ok: boolean }> {
  const slug = await specialOwnerSlug(id);
  if (!slug || !(await canManage(slug))) return { ok: false };
  await removeSpecial(id);
  revalidateSpot(slug);
  return { ok: true };
}

// A perk the Guide funds and honors itself. Admin only, and it needs no business to agree to it,
// which is the whole point: it puts something real on /passport today.
export async function createGuideSpecialAction(input: GuideSpecialInput): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: 'Not authorized' };
  const session = await auth();
  const title = clean(input.title);
  if (!title) return { ok: false, error: 'Add the perk' };
  await createGuideSpecial(session?.user?.email || 'guide', {
    title, details: clean(input.details ?? null), recurring: !!input.recurring,
    daysOfWeek: Array.isArray(input.daysOfWeek) ? input.daysOfWeek.filter((n) => n >= 0 && n <= 6) : null,
    endsOn: input.endsOn || null,
    redeemType: input.redeemType,
  });
  revalidatePath('/passport');
  revalidatePath('/admin/passport');
  return { ok: true };
}

export async function removeGuideSpecialAction(id: number): Promise<{ ok: boolean }> {
  if (!(await requireAdmin())) return { ok: false };
  await removeSpecial(id);
  revalidatePath('/passport');
  revalidatePath('/admin/passport');
  return { ok: true };
}

// ── Local Passport attribution ────────────────────────────────────────────────────────────────
// Append-only. We never update these rows; counts are derived. See sql/008_passport_events.sql.
// This is the evidence that the Guide put a body in someone's store, so it has to be recorded as
// it happens: there is no way to backfill an event we did not capture.

const PULL_SOURCES = new Set(['listing', 'passport', 'map', 'direct']);

/**
 * Someone opened the stamp on their device. Intent, not yet a visit.
 *
 * Called from a client island rather than the /ticket page body, for two reasons: the llg_anon
 * cookie is httpOnly (so the browser cannot send it itself), and a server-render hook would count
 * every crawler as a person.
 */
/**
 * The four-character code printed on the stamp.
 *
 * Derived, not stored-and-guessed: the same device, pulling the same perk, on the same day, always
 * sees the same code, so refreshing the ticket page does not change what is on their phone while they
 * are stood at the counter.
 *
 * It is NOT a secret and it does not need to be. It is not a password, it is a way to tell two people
 * at a counter apart. It only has to be unique among the handful of stamps pulled for one perk in the
 * last few hours. Ambiguous letters are out of the alphabet, because someone is going to read this
 * off a cracked phone screen in a queue.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O, no 1/I/L
function stampCodeFor(token: string, specialId: number, dayKey: string): string {
  const h = createHash('sha256').update(`${token}:${specialId}:${dayKey}`).digest();
  let out = '';
  for (let i = 0; i < 4; i++) out += CODE_ALPHABET[h[i] % CODE_ALPHABET.length];
  return out;
}

/** The Chicago calendar day. A stamp pulled at 11pm and shown at 11:05pm must have the same code. */
function chicagoDay(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export async function recordStampPull(specialId: number, source?: string): Promise<{ code: string } | null> {
  // Coerce, don't just check: this crosses the client/server boundary and specials.id originates
  // as a bigserial, which node-pg surfaces as a string. A bare Number.isInteger() here silently
  // dropped every single pull.
  const id = Number(specialId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const anon = await anonId();
  const src = source && PULL_SOURCES.has(source) ? source : 'direct';
  const code = stampCodeFor(anon, id, chicagoDay());

  // place_id is read from the perk itself, so a Guide perk (place_id null) logs correctly and a
  // later edit to the perk cannot rewrite what we already recorded.
  await pool.query(
    `insert into passport_stamp_events (place_id, special_id, event_type, visitor_token, source, stamp_code)
     select place_id, id, 'pull', $2::uuid, $3, $4 from specials where id = $1 and status = 'active'`,
    [id, anon, src, code]
  );
  return { code };
}

/**
 * The code for a stamp, WITHOUT minting a cookie.
 *
 * cookies().set() is illegal during a Server Component render (Next throws "Cookies can only be
 * modified in a Server Action or Route Handler"), and the ticket page is a Server Component. So this
 * READS the device id and returns null if there is not one yet. A first-time visitor therefore gets
 * no code from the server, and the client island fills it in a moment later from the value
 * recordStampPull returns, which is a Server Action and CAN mint.
 *
 * Reading a cookie is fine. Writing one is what is forbidden.
 */
export async function stampCodeIfKnown(specialId: number): Promise<string | null> {
  const jar = await cookies();
  const anon = jar.get('llg_anon')?.value;
  if (!anon) return null;
  return stampCodeFor(anon, Number(specialId), chicagoDay());
}

/**
 * The stamps pulled for this perk in the last four hours, for the owner to tap.
 *
 * Four hours, not all day: the person at the counter pulled their stamp minutes ago, and a list of
 * everybody who pulled one since breakfast is a list to scroll rather than a list to tap.
 */
export async function recentPulls(specialId: number): Promise<{ id: number; code: string; when: string }[]> {
  const slug = await specialOwnerSlug(specialId);
  if (!slug || !(await canManage(slug))) return [];
  const { rows } = await pool.query(
    `select e.id, e.stamp_code, e.occurred_at
       from passport_stamp_events e
      where e.special_id = $1
        and e.event_type = 'pull'
        and not e.is_bot
        and e.stamp_code is not null
        and e.occurred_at > now() - interval '4 hours'
        -- not already confirmed: once you have stamped somebody, they come off the list
        and not exists (select 1 from passport_stamp_events c where c.pull_event_id = e.id)
      order by e.occurred_at desc limit 12`,
    [Number(specialId)]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    code: r.stamp_code as string,
    when: new Date(r.occurred_at).toLocaleTimeString('en-US', {
      timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit',
    }),
  }));
}

/**
 * The owner confirmed the stamp at the counter. This is the number that closes the sale: "they
 * pulled a stamp" invites "but did they show up?" and this is the answer.
 *
 * Internally 'redeem'; every user-facing surface says "stamp it" (brand ban list).
 */
/**
 * The owner confirms a specific stamp, standing in front of a specific person.
 *
 * This is the whole ballgame. It used to write a row with no visitor_token, no link to any pull, and
 * source hardcoded to 'listing', which made "we sent you 63 customers" mean "the owner pressed a
 * button 63 times". Now the confirm carries the PULL's id, the PULL's device token and the PULL's
 * real source, so the funnel is a join and the ledger's "from your page / from the Passport" column
 * is true. An owner cannot manufacture a walk-in without a real pull existing first.
 */
export async function recordStampRedeem(pullEventId: number): Promise<{ ok: boolean; error?: string }> {
  const id = Number(pullEventId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: 'Bad stamp' };

  const { rows } = await pool.query(
    `select e.id, e.special_id, e.place_id, e.visitor_token, e.source, r.slug
       from passport_stamp_events e
       left join restaurants r on r.id = e.place_id
      where e.id = $1 and e.event_type = 'pull'`,
    [id]
  );
  const pull = rows[0];
  if (!pull) return { ok: false, error: 'No such stamp' };

  const slug = await specialOwnerSlug(Number(pull.special_id));
  if (!slug || !(await canManage(slug))) return { ok: false, error: 'Not authorized' };

  // One confirm per pull. Somebody is going to double-tap.
  const dup = await pool.query('select 1 from passport_stamp_events where pull_event_id = $1', [id]);
  if (dup.rowCount) return { ok: false, error: 'Already stamped' };

  await pool.query(
    `insert into passport_stamp_events
       (place_id, special_id, event_type, visitor_token, source, redeemed_by, pull_event_id, stamp_code)
     select place_id, special_id, 'redeem', visitor_token, source, 'owner', id, stamp_code
       from passport_stamp_events where id = $1`,
    [id]
  );
  revalidatePath(`/owner/${slug}`);
  return { ok: true };
}
