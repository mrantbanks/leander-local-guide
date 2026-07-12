import crypto from 'crypto';
import { pool } from '@/lib/db';

// ---- claim tokens -------------------------------------------------------
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function genCode(): string {
  let s = '';
  for (const b of crypto.randomBytes(4)) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `LLG-${s}`;
}

export type ClaimToken = { id: number; place_id: string; slug: string; name: string; status: string; expires_at: string };

// Mint a fresh token for a place; revokes any prior live token (so a lost sheet dies).
export async function mintClaimToken(placeId: string, createdBy: string, note?: string): Promise<{ raw: string; code: string }> {
  const raw = crypto.randomBytes(24).toString('base64url');
  const code = genCode();
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`update owner_claim_tokens set status='revoked' where place_id=$1 and status='printed'`, [placeId]);
    await client.query(
      `insert into owner_claim_tokens (place_id, token_hash, code, status, created_by, note) values ($1,$2,$3,'printed',$4,$5)`,
      [placeId, hashToken(raw), code, createdBy, note || null]
    );
    await client.query('commit');
  } catch (e) { await client.query('rollback'); throw e; }
  finally { client.release(); }
  return { raw, code };
}

async function resolveBy(where: string, val: string): Promise<ClaimToken | null> {
  const { rows } = await pool.query(
    `select t.id, t.place_id, r.slug, r.name, t.status, t.expires_at
     from owner_claim_tokens t join restaurants r on r.id = t.place_id
     where ${where} = $1 limit 1`, [val]);
  return rows[0] || null;
}
export const resolveToken = (raw: string) => resolveBy('t.token_hash', hashToken(raw));
export const resolveCode = (code: string) => resolveBy('upper(t.code)', code.trim().toUpperCase());

// Atomically consume a token and record the verified claim. Returns the slug on success.
export async function consumeClaim(tokenId: number, email: string): Promise<{ ok: boolean; slug?: string; reason?: string }> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const upd = await client.query(
      `update owner_claim_tokens set status='claimed', claimed_by=$2, claimed_at=now()
       where id=$1 and status='printed' and expires_at > now() returning place_id`, [tokenId, email]);
    if (upd.rowCount === 0) { await client.query('rollback'); return { ok: false, reason: 'This link is no longer active. Ask for a fresh one.' }; }
    const placeId = upd.rows[0].place_id;
    await client.query(
      `insert into claims (place_id, user_email, role, status, verified_via, token_id)
       values ($1,$2,'Owner','verified','token',$3)
       on conflict (place_id, user_email) do update set status='verified', verified_via='token', token_id=$3`,
      [placeId, email, tokenId]);
    const { rows } = await client.query(`select slug from restaurants where id=$1`, [placeId]);
    await client.query('commit');
    return { ok: true, slug: rows[0]?.slug };
  } catch (e) { await client.query('rollback'); throw e; }
  finally { client.release(); }
}

// ---- owner-contributed content -----------------------------------------
export type OwnerHours = ({ open: string; close: string } | null)[]; // 7, Monday-first; null = closed
export type OwnerContent = {
  blurb?: string; phone?: string; website?: string; menuUrl?: string; orderUrl?: string; happyHour?: string;
  hours?: OwnerHours; updatedBy?: string; updatedAt?: string;
  /** Uploaded filename of the owner's logo. Rendered in the spot page hero. */
  logo?: string;
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM', h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${ap}` : `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}
// Convert owner Monday-first hours -> the Google `hours` shape (periods + weekdayDescriptions)
// so all downstream display/open-now logic works unchanged.
export function ownerHoursToGoogle(h: OwnerHours): { periods: { open: { day: number; hour: number; minute: number }; close: { day: number; hour: number; minute: number } }[]; weekdayDescriptions: string[] } {
  const periods = [], desc: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = h[i];
    if (!d || !d.open || !d.close) { desc.push(`${DAY_NAMES[i]}: Closed`); continue; }
    const gday = (i + 1) % 7; // Monday-first -> Google Sunday=0
    const [oh, om] = d.open.split(':').map(Number);
    const [ch, cm] = d.close.split(':').map(Number);
    periods.push({ open: { day: gday, hour: oh, minute: om }, close: { day: gday, hour: ch, minute: cm } });
    desc.push(`${DAY_NAMES[i]}: ${fmt12(d.open)} – ${fmt12(d.close)}`);
  }
  return { periods, weekdayDescriptions: desc };
}

export async function getOwnerContent(slug: string): Promise<{ ownerContent: OwnerContent; googleWeek: string[] | null }> {
  const { rows } = await pool.query(`select owner_content, hours from restaurants where slug=$1`, [slug]);
  return { ownerContent: rows[0]?.owner_content || {}, googleWeek: rows[0]?.hours?.weekdayDescriptions || null };
}

export async function saveOwnerContent(slug: string, patch: Partial<OwnerContent>, email: string): Promise<void> {
  // merge into existing owner_content; only ever touches owner_content (never editorial/attributes)
  await pool.query(
    `update restaurants set owner_content = coalesce(owner_content,'{}'::jsonb) || $2::jsonb where slug=$1`,
    [slug, JSON.stringify({ ...patch, updatedBy: email, updatedAt: new Date().toISOString() })]);
}

// places this email verifiably owns (for /owner picker)
export async function ownedPlaces(email: string): Promise<{ slug: string; name: string }[]> {
  const { rows } = await pool.query(
    `select r.slug, r.name from claims c join restaurants r on r.id=c.place_id
     where lower(c.user_email)=lower($1) and c.status='verified' order by r.name`, [email]);
  return rows;
}

/**
 * Guard for every page under /owner/[slug]. The layout already blocks rendering, but a layout is a
 * wrapper and not a security boundary, and these pages fetch the owner's own data. Cheap to re-check.
 */
export async function ownerGate(slug: string): Promise<string | null> {
  const { auth } = await import('@/auth');
  const { isVerifiedOwner } = await import('@/lib/spots');
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  // Admins can open any owner desk. Anthony has to be able to see EXACTLY what an owner sees, both to
  // help them over the phone and to demo the product without maintaining a separate fake of it.
  if ((session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return email;
  if (!(await isVerifiedOwner(slug, email))) return null;
  return email;
}

/**
 * Can this signed-in user manage this listing? Verified owner, or an admin.
 *
 * The admin bypass is what lets /admin/owner-desk be the REAL owner desk for a demo restaurant
 * rather than a hand-maintained fake of it, and it lets Anthony fix an owner's hours over the phone.
 * Every owner-facing mutation goes through here, so the two can never disagree about who is allowed.
 */
export async function canManage(slug: string): Promise<string | null> {
  const { auth } = await import('@/auth');
  const { isVerifiedOwner } = await import('@/lib/spots');
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  if ((session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return email;
  return (await isVerifiedOwner(slug, email)) ? email : null;
}
