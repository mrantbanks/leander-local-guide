// Apply a batch of editorial rewrites (summary-of-reviews) safely via parameterized queries.
// Run from /home/leanderlocalguide.com/app (has pg):
//   DB_URL=postgres://postgres:PASS@172.28.0.2:5432/postgres node /tmp/apply-rewrites.mjs /tmp/rewrites-batch.json
import pg from 'pg';
import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const pool = new pg.Pool({ connectionString: process.env.DB_URL });
let n = 0;
for (const r of data) {
  const ed = { hook: r.hook, review: r.review, whatToOrder: r.whatToOrder, gotcha: r.gotcha || '', summaryNote: r.summaryNote, cantWait: r.cantWait, summarized: true, visited: false, edited: '2026-06-24' };
  if (/[—–]/.test(JSON.stringify(ed))) { console.error(`DASH in ${r.slug}`); }
  const res = await pool.query('update restaurants set editorial = editorial || $2::jsonb, updated_at = now() where slug = $1', [r.slug, JSON.stringify(ed)]);
  n += res.rowCount; console.log(`${res.rowCount ? 'ok' : 'MISS'} ${r.slug}`);
}
console.log(`applied ${n}/${data.length}`);
await pool.end();
