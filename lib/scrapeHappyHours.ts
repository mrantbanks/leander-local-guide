import { pool } from '@/lib/db';
import { hasClockTime } from '@/lib/validate';
import { runJSON } from '@/lib/ai/router';

// Visits each restaurant's website, asks Gemini to pull the happy hour, and stores it ONLY if
// it has a real clock time. Verifies existing scraped values + finds new ones. NEVER touches a
// happy hour an owner set themselves (owner_content.happyHour always wins at display anyway).

function stripHtml(h: string): string {
  return h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
/**
 * Is this address safe for the server to go and fetch?
 *
 * The scraper fetches a URL that came out of the database, which makes it a server-side request
 * driven by stored data. Even though only an admin can set `attributes.website` today, the fetch
 * runs inside web1 with a view of the private network the internet does not have, so an address
 * pointing at 127.0.0.1, a 10.x service, or the cloud metadata endpoint would be fetched happily
 * and its contents fed to a model. Cheap to refuse; expensive to explain afterwards.
 */
export function isPublicHttpUrl(raw: string): boolean {
  const s = String(raw ?? '').trim();
  if (!s) return false;
  // Detect ANY scheme, not just http(s). Testing for /^https?:\/\// and prefixing otherwise turns
  // "file:///etc/passwd" into "https://file:///etc/passwd", which parses to the host `file` and
  // sails through every check below.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(s);
  let u: URL;
  try { u = new URL(hasScheme ? s : `https://${s}`); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;

  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  // A name with no dot is not public DNS ("intranet", "wiki"). IPv6 literals have colons instead.
  if (!h.includes('.') && !h.includes(':')) return false;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return false;
  if (h === '::1' || h === '0.0.0.0') return false;
  // IPv6 private / link-local / unique-local.
  if (h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return false;

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const [a, b] = v4.slice(1).map(Number);
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 192 && b === 168) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 169 && b === 254) return false; // incl. 169.254.169.254, the metadata endpoint
    if (a >= 224) return false;
  }
  return true;
}

async function fetchSite(url: string): Promise<string | null> {
  try {
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (!isPublicHttpUrl(url)) return null;
    // 'manual': a public URL that 302s to 169.254.169.254 would otherwise walk straight past the
    // check above, because the guard only ever saw the first hop.
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeanderLocalGuideBot/1.0)' }, signal: AbortSignal.timeout(12000), redirect: 'manual' });
    if (r.status >= 300 && r.status < 400) {
      const next = r.headers.get('location');
      if (!next) return null;
      const abs = new URL(next, url).toString();
      if (!isPublicHttpUrl(abs)) return null;
      const r2 = await fetch(abs, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeanderLocalGuideBot/1.0)' }, signal: AbortSignal.timeout(12000), redirect: 'manual' });
      if (!r2.ok) return null;
      const ct2 = r2.headers.get('content-type') || '';
      if (!ct2.includes('html') && !ct2.includes('text')) return null;
      return stripHtml(await r2.text());
    }
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('html') && !ct.includes('text')) return null;
    return stripHtml(await r.text());
  } catch { return null; }
}
async function extract(text: string, name: string): Promise<string | null> {
  const prompt = `Extract the happy hour for the restaurant "${name}" from its website text. If it has a happy hour WITH specific times, return ONE concise line with the days, times, and any drink/food specials (example: "Mon-Fri 4-7 PM, $5 margaritas, half-price apps"). Use hyphens for ranges, never em dashes. If there is no happy hour or no clear time, return null.
Return ONLY minified JSON: {"happyHour":"<one line that includes a time>" or null}
WEBSITE TEXT:
"""${text.slice(0, 7000)}"""`;
  try {
    const out = await runJSON('happy_hour', prompt) as { happyHour?: string | null };
    return out?.happyHour || null;
  } catch { return null; }
}

export async function scrapeHappyHours(runId: number): Promise<{ checked: number; found: number; skipped: number }> {
  const { rows } = await pool.query(
    `select slug, name, attributes->>'website' website, owner_content->>'happyHour' owner_hh
     from restaurants where coalesce(attributes->>'website','') <> '' order by name`);
  let checked = 0, found = 0, skipped = 0;
  const CONC = 4;
  async function run(list: typeof rows) {
    for (const r of list) {
      await pool.query('update restaurants set happy_hour_checked_at = now() where slug = $1', [r.slug]);
      checked++;
      if (r.owner_hh && String(r.owner_hh).trim()) { skipped++; continue; } // owner-set: never override
      const text = await fetchSite(r.website);
      if (text && /happy\s*hour/i.test(text)) {
        const hh = await extract(text, r.name);
        if (hh && hasClockTime(hh)) {
          await pool.query('update restaurants set happy_hour = $2, updated_at = now() where slug = $1', [r.slug, String(hh).slice(0, 200)]);
          found++;
        }
      }
      if (checked % 8 === 0) await pool.query('update scraper_runs set checked = $2, found = $3 where id = $1', [runId, checked, found]).catch(() => {});
    }
  }
  const chunks = Array.from({ length: CONC }, (_, i) => rows.filter((_, j) => j % CONC === i));
  await Promise.all(chunks.map(run));
  return { checked, found, skipped };
}
