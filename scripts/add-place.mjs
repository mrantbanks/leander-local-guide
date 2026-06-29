#!/usr/bin/env node
// Add a spot to the guide by Google Place ID (or by text search).
//
// Pulls the place from the Google Places API (New), maps it into the exact
// shape used by data/restaurants.json + the `restaurants` table, and (when you
// pass --commit) writes it to both the seed JSON and Postgres.
//
// The live source of truth is Postgres (llg-db). data/restaurants.json is the
// seed source. By default this runs DRY (fetch + print, no writes).
//
// Usage:
//   GOOGLE_PLACES_KEY=... node scripts/add-place.mjs <PlaceID>
//   GOOGLE_PLACES_KEY=... node scripts/add-place.mjs --search "All Lalison Baghdad Rd Leander TX"
//   ... add --json   to append to data/restaurants.json
//   ... add --db     to insert into Postgres (needs DATABASE_URL)
//   ... add --commit for both (--json --db)
//
// Run on web1 where the real key + DB live, e.g.:
//   cd /home/leanderlocalguide.com && export $(grep -E 'GOOGLE_PLACES_KEY|DATABASE_URL' .env | xargs) \
//     && node app/scripts/add-place.mjs --search "All Lalison Leander TX"

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(__dirname, '..', 'data', 'restaurants.json');

const KEY = process.env.GOOGLE_PLACES_KEY;
if (!KEY) {
  console.error('✗ GOOGLE_PLACES_KEY is not set. Export it first (it lives in the site .env on web1).');
  process.exit(1);
}

// ---- args -------------------------------------------------------------
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const wantJson = flags.has('--json') || flags.has('--commit');
const wantDb = flags.has('--db') || flags.has('--commit');

const searchIdx = argv.indexOf('--search');
const searchQuery = searchIdx >= 0 ? argv[searchIdx + 1] : null;
const nameIdx = argv.indexOf('--name');
const nameOverride = nameIdx >= 0 ? argv[nameIdx + 1] : null; // clean up messy Google display names
// Positional = bare args, excluding the values that follow --search / --name.
const skipIdx = new Set([searchIdx >= 0 ? searchIdx + 1 : -1, nameIdx >= 0 ? nameIdx + 1 : -1]);
const positional = argv.filter((a, i) => !a.startsWith('--') && !skipIdx.has(i));
let placeId = positional.find((a) => a.startsWith('ChIJ')) || null;

if (!placeId && !searchQuery) {
  console.error('Usage: node scripts/add-place.mjs <PlaceID> | --search "text query"  [--json] [--db] [--commit]');
  process.exit(1);
}

// ---- helpers ----------------------------------------------------------
const FIELD_MASK = [
  'id', 'displayName', 'formattedAddress', 'location', 'primaryType',
  'primaryTypeDisplayName', 'types', 'nationalPhoneNumber', 'internationalPhoneNumber',
  'priceLevel', 'rating', 'userRatingCount', 'googleMapsUri', 'addressComponents',
  'businessStatus',
].join(',');

const PRICE = {
  PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function slugify(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function searchText(query) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': FIELD_MASK.split(',').map((f) => `places.${f}`).join(','),
    },
    body: JSON.stringify({ textQuery: query, regionCode: 'US' }),
  });
  if (!r.ok) throw new Error(`Text Search ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.places || [];
}

async function placeDetails(id) {
  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
    headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELD_MASK },
  });
  if (!r.ok) throw new Error(`Place Details ${r.status}: ${await r.text()}`);
  return r.json();
}

function localityOf(p) {
  const c = (p.addressComponents || []).find((x) => (x.types || []).includes('locality'));
  return c ? c.longText : 'Leander';
}

// Build the data/restaurants.json record (nested camelCase shape).
function toJsonRecord(p, slug) {
  const rating = typeof p.rating === 'number' ? p.rating : null;
  const count = typeof p.userRatingCount === 'number' ? p.userRatingCount : null;
  return {
    id: p.id,
    slug,
    name: p.displayName?.text || slug,
    primaryCategory: p.primaryTypeDisplayName?.text || 'Restaurant',
    cuisines: [],
    googleType: p.primaryTypeDisplayName?.text || 'Restaurant',
    address: { formatted: p.formattedAddress || null, locality: localityOf(p) },
    geo: { lat: p.location?.latitude ?? null, lng: p.location?.longitude ?? null },
    links: { googleMapsUrl: p.googleMapsUri || null },
    priceTier: p.priceLevel != null ? (PRICE[p.priceLevel] ?? null) : null,
    hours: null,
    photos: [],
    badgesEditorial: [],
    attributes: { chainStatus: 'unknown' },
    editorial: null,
    ratings: rating != null ? { composite: null, google: { rating, count } } : { composite: null },
    status: 'needs_enrich',
    provenance: { core: 'google_places_new', addedBy: 'add-place', phone: p.nationalPhoneNumber || null },
  };
}

// ---- main -------------------------------------------------------------
(async () => {
  // Resolve a Place ID via search if needed.
  if (!placeId) {
    console.log(`🔎 Searching: "${searchQuery}"\n`);
    const hits = await searchText(searchQuery);
    if (!hits.length) {
      console.log('✗ Google Places returned NO results for that query. Try the phone number alone as the query.');
      process.exit(2);
    }
    hits.slice(0, 5).forEach((h, i) => {
      console.log(`  [${i}] ${h.displayName?.text}`);
      console.log(`      ${h.formattedAddress}`);
      console.log(`      ☎ ${h.nationalPhoneNumber || '—'}   id: ${h.id}`);
    });
    placeId = hits[0].id;
    console.log(`\n→ Using top result [0]. Re-run with that explicit id if a different one is correct.\n`);
  }

  const place = await placeDetails(placeId);

  // Build slug (match existing convention: slugified name, ensure ends in -leander).
  const raw = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.restaurants;
  const existingIds = new Set(list.map((r) => r.id));
  const existingSlugs = new Set(list.map((r) => r.slug));

  const displayName = nameOverride || place.displayName?.text || placeId;
  let slug = slugify(displayName);
  if (!slug.endsWith('leander')) slug += '-leander';
  let s = slug, n = 2;
  while (existingSlugs.has(s)) s = `${slug}-${n++}`;
  slug = s;

  const record = toJsonRecord(place, slug);
  if (nameOverride) record.name = nameOverride;

  console.log('── Mapped record ───────────────────────────────────────────');
  console.log(JSON.stringify(record, null, 2));
  console.log('────────────────────────────────────────────────────────────');
  console.log(`phone(google): ${place.nationalPhoneNumber || '—'}   businessStatus: ${place.businessStatus || '—'}`);

  if (existingIds.has(place.id)) {
    console.log(`\n⚠  Place ID ${place.id} is ALREADY in the guide — nothing to add.`);
    process.exit(0);
  }
  if (!wantJson && !wantDb) {
    console.log('\n(dry run — no writes. Add --commit to write JSON + DB, or --json / --db.)');
    process.exit(0);
  }

  // Write JSON seed.
  if (wantJson) {
    list.push(record);
    writeFileSync(JSON_PATH, JSON.stringify(Array.isArray(raw) ? list : raw, null, 2) + '\n');
    console.log(`\n✓ Appended to data/restaurants.json (now ${list.length} spots).`);
  }

  // Insert into Postgres.
  if (wantDb) {
    if (!process.env.DATABASE_URL) {
      console.error('✗ --db requested but DATABASE_URL is not set.');
      process.exit(1);
    }
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    const r = record;
    const res = await pool.query(
      `insert into restaurants
         (id, slug, name, primary_category, cuisines, google_type, address_formatted,
          locality, lat, lng, geom, google_maps_url, price_tier, attributes, ratings,
          status, provenance)
       values
         ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          ST_SetSRID(ST_MakePoint($10,$9),4326)::geography,
          $11,$12,$13,$14,$15,$16)
       on conflict (id) do nothing
       returning slug`,
      [
        r.id, r.slug, r.name, r.primaryCategory, r.cuisines, r.googleType,
        r.address.formatted, r.address.locality, r.geo.lat, r.geo.lng,
        r.links.googleMapsUrl, r.priceTier, r.attributes, r.ratings,
        r.status, r.provenance,
      ],
    );
    await pool.end();
    console.log(res.rowCount
      ? `✓ Inserted into Postgres as /r/${res.rows[0].slug} (status=needs_enrich).`
      : '• Postgres already had this id — no row inserted.');
  }

  console.log('\nNext: run your enrichment pass to fill hours/photos/editorial.');
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
