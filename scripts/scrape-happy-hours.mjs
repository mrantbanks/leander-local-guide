// Happy-hour scraper: visits each restaurant's website, asks Gemini to pull the happy hour
// (days, times, specials), and stores it ONLY if it contains a real clock time (guardrail).
// Run in the llg-web container with DB_URL + GKEY env. ONLY_MISSING=1 to fill blanks only.
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DB_URL, max: 6 });
const KEY = process.env.GKEY;
const hasTime = (s) => !!s && /\b\d{1,2}\s*:?\d{0,2}\s*(am|pm)\b|\b\d{1,2}:\d{2}\b/i.test(s);

function stripHtml(h) {
  return h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
async function fetchSite(url) {
  try {
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeanderLocalGuideBot/1.0)' }, signal: AbortSignal.timeout(12000), redirect: 'follow' });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('html') && !ct.includes('text')) return null;
    return stripHtml(await r.text());
  } catch { return null; }
}
async function extract(text, name) {
  const prompt = `Extract the happy hour for the restaurant "${name}" from its website text. If it has a happy hour WITH specific times, return ONE concise line with the days, times, and any drink/food specials (example: "Mon-Fri 4-7 PM, $5 margaritas, half-price apps"). Use hyphens for ranges, never em dashes. If there is no happy hour or no clear time, return null.
Return ONLY minified JSON: {"happyHour":"<one line that includes a time>" or null}
WEBSITE TEXT:
"""${text.slice(0, 7000)}"""`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }),
    });
    const j = await r.json();
    const t = j?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
    return JSON.parse(t)?.happyHour || null;
  } catch { return null; }
}

const onlyMissing = process.env.ONLY_MISSING === '1';
const { rows } = await pool.query(`select slug, name, attributes->>'website' website, owner_content->>'happyHour' owner_hh from restaurants where coalesce(attributes->>'website','') <> '' ${onlyMissing ? "and coalesce(happy_hour,'')=''" : ''} order by name`);
console.log(`scraping ${rows.length} sites (onlyMissing=${onlyMissing})...`);
let checked = 0, updated = 0, skipped = 0;
const CONC = 4;
async function run(list) {
  for (const r of list) {
    await pool.query('update restaurants set happy_hour_checked_at = now() where slug = $1', [r.slug]);
    checked++;
    if (r.owner_hh && String(r.owner_hh).trim()) { skipped++; continue; } // owner-set: never override
    const text = await fetchSite(r.website);
    if (!text || !/happy\s*hour/i.test(text)) continue;
    const hh = await extract(text, r.name);
    if (hh && hasTime(hh)) {
      await pool.query('update restaurants set happy_hour = $2, updated_at = now() where slug = $1', [r.slug, String(hh).slice(0, 200)]);
      updated++; console.log(`OK ${r.name}: ${hh}`);
    }
  }
}
const chunks = Array.from({ length: CONC }, (_, i) => rows.filter((_, j) => j % CONC === i));
await Promise.all(chunks.map(run));
console.log(`DONE: checked ${checked}, stored ${updated}, owner-set skipped ${skipped}`);
await pool.end();
