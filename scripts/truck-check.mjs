#!/usr/bin/env node
// Read-only: for given slugs, fetch Google editorialSummary + raw reviews and
// report explicit food-truck / trailer / stand evidence. Helps decide tagging.
//   node scripts/truck-check.mjs slug1 slug2 ...
import pg from 'pg';
const KEY = process.env.GOOGLE_PLACES_KEY;
const slugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const SRC = 'food truck|food trailer|\\btrailer\\b|food park|walk-?up window|to-?go window|order(ed)? at the window|gravel lot|\\bparked\\b|\\bpod\\b|\\bstand\\b|\\bcart\\b|trailer park|outdoor seating only|picnic table';
const RX = new RegExp(SRC, 'i');
const RXG = new RegExp(SRC, 'gi');

(async () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  for (const slug of slugs) {
    const { rows } = await pool.query('select id, name from restaurants where slug=$1', [slug]);
    if (!rows[0]) { console.log(`\n${slug}: not found`); continue; }
    const r = await fetch(`https://places.googleapis.com/v1/places/${rows[0].id}`, {
      headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'editorialSummary,reviews,primaryTypeDisplayName' },
    });
    const j = await r.json();
    const sum = j.editorialSummary?.text || '';
    const reviews = (j.reviews || []).map((rv) => rv.text?.text || '').filter(Boolean);
    const hay = [sum, ...reviews].join(' \n ');
    const hits = [...hay.matchAll(RXG)].map((m) => m[0].toLowerCase());
    const verdict = RX.test(sum) ? 'TRUCK (Google summary)' : hits.length ? `signals: ${[...new Set(hits)].join(', ')}` : 'no explicit signal';
    console.log(`\n## ${rows[0].name} [${j.primaryTypeDisplayName?.text || '?'}] -> ${verdict}`);
    if (sum) console.log(`   summary: ${sum}`);
    // show one review line containing a hit
    for (const rv of reviews) { const m = rv.match(RX); if (m) { const i = Math.max(0, rv.toLowerCase().indexOf(m[0].toLowerCase()) - 60); console.log(`   review: ...${rv.slice(i, i + 160).replace(/\n/g, ' ')}...`); break; } }
  }
  await pool.end();
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
