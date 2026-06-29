#!/usr/bin/env node
// Enrich a spot (by slug) to full parity with the rest of the guide:
//   hours, photos, attributes (phone/takeout/delivery/chainStatus), cuisines,
//   and Anthony's AI editorial (grounded in real Google reviews) -> status=enriched.
//
// Reuses the SAME persona + voice rules as app/api/admin/review-ai/route.ts so the
// editorial matches every other listing. Dry by default; --commit writes to Postgres.
//
// Env: GOOGLE_PLACES_KEY, GEMINI_API_KEY, DATABASE_URL (all present in the llg-web container).
// Usage (in container on web1):
//   node scripts/enrich-place.mjs lali-son-fast-food-leander [--cuisines "Indian,Nepalese"] [--commit]

import pg from 'pg';

const KEY = process.env.GOOGLE_PLACES_KEY;
const GEMINI = process.env.GEMINI_API_KEY;
if (!KEY || !GEMINI) { console.error('✗ need GOOGLE_PLACES_KEY and GEMINI_API_KEY'); process.exit(1); }

const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith('--'));
const commit = argv.includes('--commit') || argv.includes('--db'); // --db kept for parity with add-place
const isChain = argv.includes('--chain');
const cIdx = argv.indexOf('--cuisines');
const cuisinesArg = cIdx >= 0 ? argv[cIdx + 1].split(',').map((s) => s.trim()).filter(Boolean) : null;
if (!slug) { console.error('Usage: enrich-place.mjs <slug> [--cuisines "A,B"] [--commit]'); process.exit(1); }

// --- persona copied verbatim from app/api/admin/review-ai/route.ts ---------
const PERSONA = "You are Anthony, 'The Leander Local', writing about Leander, Texas food in the voice of Anthony Bourdain: wry, vivid, honest, sharp, a little irreverent, never corporate or fawning, specific about the food and the room, short punchy sentences with the occasional longer riff. No purple prose, no tired cliches ('culinary journey', 'foodie', 'to die for'). HOUSE RULE: never use em dashes or en dashes anywhere; use commas or periods only.";

const PRICE = { PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };
const TODAY = '2026-06-29';

// strip em/en dashes from model output, per house rule
const dedash = (s) => typeof s === 'string' ? s.replace(/[ \t]*[—–][ \t]*/g, ', ').replace(/[—–]/g, '-') : s;

const DETAIL_FIELDS = [
  'id', 'displayName', 'primaryTypeDisplayName', 'nationalPhoneNumber', 'priceLevel',
  'rating', 'userRatingCount', 'googleMapsUri', 'businessStatus', 'regularOpeningHours',
  'photos', 'reviews', 'takeout', 'delivery', 'dineIn', 'editorialSummary',
].join(',');

async function placeDetails(id) {
  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
    headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': DETAIL_FIELDS },
  });
  if (!r.ok) throw new Error(`Place Details ${r.status}: ${await r.text()}`);
  return r.json();
}

async function gemini(instruction) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`;
  const body = { contents: [{ parts: [{ text: instruction }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.9 } };
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await resp.json();
  const txt = j?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!txt) throw new Error(j?.error?.message || 'Gemini returned no text');
  try { return JSON.parse(txt); } catch { return JSON.parse(txt.replace(/^```json\s*|\s*```$/g, '')); }
}

(async () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const { rows } = await pool.query('select id, name, primary_category cat, cuisines, ratings, status from restaurants where slug = $1', [slug]);
  const row = rows[0];
  if (!row) { console.error(`✗ no spot with slug ${slug}`); process.exit(1); }
  console.log(`Enriching ${row.name} (${slug}) — current status: ${row.status}`);

  const p = await placeDetails(row.id);

  // --- hours: Places periods map straight to the stored shape ---
  const hours = p.regularOpeningHours?.periods?.length ? { periods: p.regularOpeningHours.periods } : null;

  // --- photos: top 8, stored as {h,w,name,attribution} ---
  const photos = (p.photos || []).slice(0, 8).map((ph) => ({
    h: ph.heightPx, w: ph.widthPx, name: ph.name,
    attribution: (ph.authorAttributions || []).map((a) => a.displayName).filter(Boolean),
  }));

  // --- attributes (merge with existing) ---
  const attrs = {
    phone: p.nationalPhoneNumber || null,
    takeout: p.takeout ?? null,
    delivery: p.delivery ?? null,
    dineIn: p.dineIn ?? null,
    chainStatus: isChain ? 'chain' : 'local', // --chain for national brands
    businessStatus: p.businessStatus || null,
  };

  // --- editorial: ground Gemini in real Google review snippets ---
  const reviews = (p.reviews || []).map((rv) => rv.text?.text || rv.originalText?.text).filter(Boolean);
  const notes = reviews.length
    ? reviews.map((t, i) => `Review ${i + 1}: ${t}`).join('\n\n').slice(0, 4000)
    : '(no review text available; work from the rating)';
  const ratingTxt = `Google rating ${p.rating ?? row.ratings?.google?.rating ?? 'n/a'} from ${p.userRatingCount ?? row.ratings?.google?.count ?? 0} reviews`;
  const ctx = `Restaurant: ${row.name}. Category: ${p.primaryTypeDisplayName?.text || row.cat}. Cuisines: ${(cuisinesArg || row.cuisines || []).join(', ') || 'unknown'}. ${ratingTxt}.`;
  const task = `Anthony has NOT been here yet. Do NOT pretend he has. Write an honest SUMMARY of what reviewers actually say below, third-person ("by most accounts", "reviewers say", "the word going around"), in his voice, grounded in the Google rating and the real reviews. Be specific about dishes reviewers actually name.`;
  const shape = `{"verdict":"WORTH IT" or "IT'S FINE" or "SKIP IT" (best read from the reviews),"hook":"one punchy line, max ~12 words","review":"2 short paragraphs, the diners' read, separated by \\n\\n","whatToOrder":"the dishes reviewers actually rave about, 1 to 2 sentences","cantWait":"one line, first person, about wanting to try it","summaryNote":"one honest line admitting he hasn't been yet, in his voice","gotcha":"optional one-line heads up, or empty string"}`;
  const instruction = `${PERSONA}\n\n${ctx}\n\n${task}\n\nReal Google reviews:\n"""${notes}"""\n\nReturn ONLY minified JSON with exactly these keys: ${shape}. Everything in his voice. No em or en dashes.`;

  const draft = await gemini(instruction);
  const editorial = {
    hook: dedash(draft.hook), review: dedash(draft.review), verdict: draft.verdict || 'WORTH IT',
    whatToOrder: dedash(draft.whatToOrder), cantWait: dedash(draft.cantWait),
    summaryNote: dedash(draft.summaryNote), gotcha: dedash(draft.gotcha) || '',
    source: 'editorial', visited: false, summarized: true, generated: TODAY, edited: TODAY,
  };

  const cuisines = cuisinesArg || row.cuisines || [];
  const priceTier = p.priceLevel != null ? (PRICE[p.priceLevel] ?? null) : null;

  console.log('\n── Editorial (Anthony) ─────────────────────────────────────');
  console.log(JSON.stringify(editorial, null, 2));
  console.log('── Data ────────────────────────────────────────────────────');
  console.log(`hours periods: ${hours?.periods?.length || 0} | photos: ${photos.length} | cuisines: ${cuisines.join(', ') || '(none)'} | price: ${priceTier ?? '—'}`);
  console.log(`attributes: ${JSON.stringify(attrs)}`);

  if (!commit) { console.log('\n(dry run — no writes. Add --commit to apply + set status=enriched.)'); await pool.end(); return; }

  await pool.query(
    `update restaurants set
       editorial = $2::jsonb,
       hours = $3::jsonb,
       photos = $4::jsonb,
       cuisines = $5::text[],
       price_tier = coalesce(price_tier, $6),
       attributes = coalesce(attributes,'{}'::jsonb) || $7::jsonb,
       status = 'enriched',
       updated_at = now()
     where slug = $1`,
    [slug, JSON.stringify(editorial), hours ? JSON.stringify(hours) : null,
     JSON.stringify(photos), cuisines, priceTier, JSON.stringify(attrs)],
  );
  await pool.end();
  console.log(`\n✓ ${slug} enriched (status=enriched). It will show on the live site on next request.`);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
