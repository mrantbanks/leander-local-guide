import { pool } from '@/lib/db';
import { hasClockTime } from '@/lib/validate';

// Visits each restaurant's website, asks Gemini to pull the happy hour, and stores it ONLY if
// it has a real clock time. Verifies existing scraped values + finds new ones. NEVER touches a
// happy hour an owner set themselves (owner_content.happyHour always wins at display anyway).

function stripHtml(h: string): string {
  return h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
async function fetchSite(url: string): Promise<string | null> {
  try {
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeanderLocalGuideBot/1.0)' }, signal: AbortSignal.timeout(12000), redirect: 'follow' });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('html') && !ct.includes('text')) return null;
    return stripHtml(await r.text());
  } catch { return null; }
}
async function extract(text: string, name: string, key: string): Promise<string | null> {
  const prompt = `Extract the happy hour for the restaurant "${name}" from its website text. If it has a happy hour WITH specific times, return ONE concise line with the days, times, and any drink/food specials (example: "Mon-Fri 4-7 PM, $5 margaritas, half-price apps"). Use hyphens for ranges, never em dashes. If there is no happy hour or no clear time, return null.
Return ONLY minified JSON: {"happyHour":"<one line that includes a time>" or null}
WEBSITE TEXT:
"""${text.slice(0, 7000)}"""`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }),
    });
    const j = await r.json();
    const t = j?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text;
    return JSON.parse(t)?.happyHour || null;
  } catch { return null; }
}

export async function scrapeHappyHours(runId: number): Promise<{ checked: number; found: number; skipped: number }> {
  const key = process.env.GEMINI_API_KEY || '';
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
        const hh = await extract(text, r.name, key);
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
