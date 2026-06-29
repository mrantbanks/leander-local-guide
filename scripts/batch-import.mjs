#!/usr/bin/env node
// Batch import + full enrichment for a fixed list of Google Place IDs.
// For each: add-place.mjs (--db, bare insert) -> look up slug -> enrich-place.mjs
// (--db: hours, photos, attributes, cuisines, review-of-reviews editorial, status=enriched).
// Idempotent: add-place skips ids already present; enrich just refreshes. Re-runnable.
//
// Run in the llg-web container (has GOOGLE_PLACES_KEY, GEMINI_API_KEY, DATABASE_URL):
//   node scripts/batch-import.mjs            (dry: lists what it would do)
//   node scripts/batch-import.mjs --commit   (actually writes)

import { execFileSync } from 'node:child_process';
import pg from 'pg';

const commit = process.argv.includes('--commit');

// name: clean display name override (optional). cuisines: comma list (optional). chain: national brand.
const LIST = [
  // ---- local / independent ----
  { id: 'ChIJ9YVBk1QrW4YRm_7hkr_FpLg', name: 'Aroma Leander', cuisines: 'Indian' },
  { id: 'ChIJK9-XXMUtW4YRoWeHIB5zPrU', cuisines: 'Italian' },                       // Beyond Pompeii Pizza
  { id: 'ChIJ_SsJTSfTRIYRCfOR2GpKHsE', name: 'Birrieria Mama Rosa', cuisines: 'Mexican' },
  { id: 'ChIJNzQGEwAtW4YRUYQO5oztjDM', cuisines: 'Thai' },                          // Coat and Thai
  { id: 'ChIJrXUGEAotW4YRFgga21IOyrI', name: 'Desi Dhaba / Kebab Bar & Grill', cuisines: 'Indian' },
  { id: 'ChIJXYKn2P8sW4YR1U3dLIwlG3U', cuisines: 'Italian' },                       // DoubleDave's Pizzaworks
  { id: 'ChIJ1-ZUF88tW4YRgvrdT-WgGmE' },                                            // Grand Donuts
  { id: 'ChIJL2re43EsW4YRbOyuzXNoJjs', cuisines: 'Japanese' },                      // Kai Sushi
  { id: 'ChIJe-w5D4RVyg4RkxRJ6P-XPCY', cuisines: 'Peruvian' },                      // MAKIS ATX
  { id: 'ChIJF2a7rMQtW4YRbwGfkoEL6XQ', cuisines: 'Italian' },                       // Pizza Depot
  { id: 'ChIJq6fSbsksW4YRx5yksbSPffY', cuisines: 'Italian' },                       // Pizza Twist
  { id: 'ChIJ6Yt3PwAtW4YRS-WskV0sLN8' },                                            // Sebastian's Snowcones
  { id: 'ChIJBS6Q5SMtW4YRjKdqlWq6p0Y' },                                            // Skyes Ice
  { id: 'ChIJJdH443EsW4YRytcnGK5atfs', cuisines: 'Italian' },                       // Southern's Pizza & Sports Pub
  { id: 'ChIJl80UXwArW4YReNK6Jp413RA', cuisines: 'BBQ' },                           // Stubblefield BBQ
  { id: 'ChIJD4796kAsW4YRvR4lT9tYP_I' },                                            // Super Donuts 8
  { id: 'ChIJNR2Fbn0tW4YRx_2DiESZYkQ' },                                            // Teapioca Lounge
  { id: 'ChIJn2MmWBrdWoYRZQGotXAQABY' },                                            // The Frozen Affair
  { id: 'ChIJd-Kk4B0tW4YRY2cj-LVm3h4', cuisines: 'Japanese' },                      // ZENSHI Handcrafted Sushi
  // ---- national chains (dupes / multi-location), location-named like Taco Bell ----
  { id: 'ChIJu2Uoym8sW4YRIZqNFiCNzPw', name: "Domino's Pizza (N US-183)", chain: true },
  { id: 'ChIJuzuqljstW4YR7pmLJdBzxXM', name: "Domino's Pizza (Crystal Falls)", chain: true },
  { id: 'ChIJjf-51EAsW4YRNBFU482nsvs', name: "Domino's Pizza (S Bagdad Rd)", chain: true },
  { id: 'ChIJ12pSwH4tW4YRE1E3kZ75Wd0', name: "Domino's Pizza (Ronald Reagan)", chain: true },
  { id: 'ChIJfY5S-ZUtW4YRnMbrF5bHx3I', name: 'Shipley Do-Nuts (Ronald Reagan)', chain: true },
  { id: 'ChIJYdhHkhgsW4YRUkpCWNsiiJI', name: 'Starbucks (Crystal Falls)', chain: true },
];

const sh = (args) => execFileSync('node', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

(async () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  console.log(`Batch: ${LIST.length} spots. mode=${commit ? 'COMMIT' : 'dry'}\n`);
  const ok = [], failed = [];
  for (const [i, item] of LIST.entries()) {
    const label = item.name || item.id;
    try {
      if (!commit) { console.log(`[${i + 1}/${LIST.length}] would add+enrich ${label}${item.chain ? ' (chain)' : ''}${item.cuisines ? ` [${item.cuisines}]` : ''}`); continue; }
      // 1) bare insert
      const addArgs = ['scripts/add-place.mjs', item.id, ...(item.name ? ['--name', item.name] : []), '--db'];
      const addOut = sh(addArgs);
      // 2) resolve slug from DB by id
      const { rows } = await pool.query('select slug from restaurants where id = $1', [item.id]);
      if (!rows[0]) throw new Error('row not found after add');
      const slug = rows[0].slug;
      // 3) enrich
      const enrArgs = ['scripts/enrich-place.mjs', slug, ...(item.cuisines ? ['--cuisines', item.cuisines] : []), ...(item.chain ? ['--chain'] : []), '--db'];
      sh(enrArgs);
      const added = /Inserted into Postgres/.test(addOut);
      console.log(`[${i + 1}/${LIST.length}] ✓ ${label} -> /r/${slug} ${added ? '(new)' : '(existed, re-enriched)'}`);
      ok.push(slug);
    } catch (e) {
      console.error(`[${i + 1}/${LIST.length}] ✗ ${label}: ${String(e.message).split('\n')[0]}`);
      failed.push(label);
    }
  }
  await pool.end();
  console.log(`\nDone. ${ok.length} ok, ${failed.length} failed.${failed.length ? ' Failed: ' + failed.join(', ') : ''}`);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
