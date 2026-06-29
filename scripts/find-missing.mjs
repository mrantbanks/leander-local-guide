#!/usr/bin/env node
// Read-only: sweep Google Places for Leander food spots across many category
// queries, dedupe, filter to Leander addresses, and diff against the place IDs
// already in the restaurants table. Prints what's missing. No writes.
//
// Env: GOOGLE_PLACES_KEY, DATABASE_URL (both present in the llg-web container).
//   node scripts/find-missing.mjs

import pg from 'pg';

const KEY = process.env.GOOGLE_PLACES_KEY;
if (!KEY) { console.error('✗ need GOOGLE_PLACES_KEY'); process.exit(1); }

// Broad category net. Text Search caps ~60 results/query (3 pages), and Leander
// has 180+ food spots, so one query can't cover it; we fan out by category.
const QUERIES = [
  'restaurants', 'fast food', 'food', 'cafe', 'coffee shop', 'bakery', 'bar',
  'food truck', 'breakfast', 'brunch', 'lunch', 'dessert', 'ice cream',
  'mexican restaurant', 'tex-mex', 'indian restaurant', 'nepalese restaurant',
  'chinese restaurant', 'thai restaurant', 'vietnamese restaurant', 'asian restaurant',
  'japanese restaurant', 'sushi', 'korean restaurant', 'pizza', 'italian restaurant',
  'bbq', 'burgers', 'sandwiches', 'seafood', 'wings', 'tacos', 'donuts',
  'mediterranean restaurant', 'halal', 'african restaurant', 'caribbean restaurant',
  'steakhouse', 'diner', 'deli', 'juice bar', 'tea', 'bubble tea', 'wine bar', 'brewery',
];

// Bias around Leander center; we still hard-filter by "Leander, TX" in the address.
const LEANDER = { latitude: 30.5788, longitude: -97.8531 };
const MASK = 'places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.businessStatus,nextPageToken';

async function searchPage(query, pageToken) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': MASK },
    body: JSON.stringify({
      textQuery: `${query} in Leander TX`,
      regionCode: 'US',
      locationBias: { circle: { center: LEANDER, radius: 9000 } },
      ...(pageToken ? { pageToken } : {}),
    }),
  });
  if (!r.ok) throw new Error(`${query}: ${r.status} ${await r.text()}`);
  return r.json();
}

(async () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const { rows } = await pool.query('select id from restaurants');
  await pool.end();
  const have = new Set(rows.map((r) => r.id));
  console.log(`DB has ${have.size} place IDs. Sweeping ${QUERIES.length} category queries...\n`);

  const found = new Map(); // id -> {name, addr, type, status}
  let calls = 0;
  for (const q of QUERIES) {
    let token = null;
    for (let page = 0; page < 3; page++) {
      let j;
      try { j = await searchPage(q, token); } catch (e) { console.error('  !', e.message.slice(0, 120)); break; }
      calls++;
      for (const p of j.places || []) {
        const addr = p.formattedAddress || '';
        if (!/Leander,\s*TX/i.test(addr)) continue; // exclude Cedar Park / Austin spillover
        if (!found.has(p.id)) found.set(p.id, {
          name: p.displayName?.text || '(no name)', addr,
          type: p.primaryTypeDisplayName?.text || '?', status: p.businessStatus || '?',
        });
      }
      token = j.nextPageToken;
      if (!token) break;
    }
  }

  // Keep only actual food/drink venues; drop gas stations, retail, services, etc.
  const NONFOOD = /gas station|convenience|grocery|supermarket|shopping mall|wellness|health|hospital|gift shop|event venue|^services$|pharmacy|hotel|salon|gym|wholesal|distributor|warehouse|corporate office|school|church/i;
  const FOODISH = /restaurant|cafe|coffee|bakery|\bbar\b|grill|pizza|bbq|barbecue|ice cream|donut|dessert|tea house|juice|smoothie|deli|diner|sandwich|taco|sushi|steak|\bfood\b|bistro|pub|brewery|snow ?cone|creamery|meal|cream shop|bagel|breakfast|cafeteria/i;
  const isFood = (t) => FOODISH.test(t) && !NONFOOD.test(t);
  // national chains the owner may or may not want
  const CHAIN = /papa john|papa murphy|pizza hut|domino|little caesar|smoothie king|shipley|dunkin|starbucks|mcdonald|wendy|burger king|taco bell|subway|sonic|whataburger|chipotle|jack in the box|wingstop|kfc|chick-fil/i;

  const missing = [...found.entries()].filter(([id]) => !have.has(id));
  const food = missing.filter(([, v]) => isFood(v.type) && (v.status === 'OPERATIONAL' || v.status === '?'));
  const locals = food.filter(([, v]) => !CHAIN.test(v.name));
  const chains = food.filter(([, v]) => CHAIN.test(v.name));
  const nonfood = missing.length - food.length;

  console.log(`Swept ${found.size} distinct Leander, TX places in ${calls} API calls.`);
  console.log(`In guide: ${found.size - missing.length}. Missing total: ${missing.length} (${nonfood} non-food/closed filtered out).`);
  console.log(`MISSING EATERIES: ${food.length}  ->  ${locals.length} local/independent, ${chains.length} national chains.\n`);

  console.log('── MISSING — local / independent ───────────────────────────');
  for (const [id, v] of locals.sort((a, b) => a[1].name.localeCompare(b[1].name))) {
    console.log(`• ${v.name}  [${v.type}]`);
    console.log(`    ${v.addr}   ${id}`);
  }
  console.log('\n── MISSING — national chains (your call) ───────────────────');
  for (const [, v] of chains.sort((a, b) => a[1].name.localeCompare(b[1].name))) console.log(`• ${v.name}  [${v.type}]  ${v.addr}`);

  console.log('\nLOCAL_IDS=' + locals.map(([id]) => id).join(','));
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
