import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { consumeClaim, hashToken } from '@/lib/owner';
import { ldJson } from '@/lib/seo';
import { safeUrl } from '@/lib/urls';
import { secretEq } from '@/lib/secretAuth';
import { rateLimit, __resetRateLimits } from '@/lib/ratelimit';
import { isPublicHttpUrl } from '@/lib/scrapeHappyHours';
import { hashIp } from '@/lib/privacy';

// @ts-expect-error - resolved to tests/stubs/pg.mjs by tests/hooks.mjs
import { CALLS, __reset, __setResponses } from 'pg';

/* ------------------------------------------------------------------------------------------- */
/* CRITICAL: claim tokens must be bound to the secret, not to a guessable row id.                */
/* ------------------------------------------------------------------------------------------- */
describe('owner claim binding', () => {
  beforeEach(() => __reset());

  test('consuming by CODE matches on the code, never on an id', async () => {
    __setResponses([
      {},                                                     // begin
      { rowCount: 1, rows: [{ id: 7, place_id: 'p1' }] },     // update ... returning
      { rowCount: 1, rows: [] },                              // insert into claims
      { rowCount: 1, rows: [{ slug: 'cielo-rojo' }] },        // select slug
      {},                                                     // commit
    ]);

    const res = await consumeClaim({ kind: 'code', value: ' llg-ab7k ' }, 'owner@example.com');
    assert.equal(res.ok, true);
    assert.equal(res.slug, 'cielo-rojo');

    const upd = CALLS.find((c: { sql: string }) => /update owner_claim_tokens/i.test(c.sql));
    assert.ok(upd, 'expected an UPDATE on owner_claim_tokens');
    assert.match(upd.sql, /upper\(code\) = \$1/, 'the code must be in the WHERE clause');
    assert.doesNotMatch(upd.sql, /\bid\s*=\s*\$/, 'must NOT select the row by id');
    // trimmed and upper-cased, so a code read off a phone still matches
    assert.equal(upd.params[0], 'LLG-AB7K');
  });

  test('consuming by TOKEN matches on the sha256 hash, never the raw value', async () => {
    __setResponses([
      {},
      { rowCount: 1, rows: [{ id: 9, place_id: 'p2' }] },
      { rowCount: 1, rows: [] },
      { rowCount: 1, rows: [{ slug: 'taco-trailer' }] },
      {},
    ]);

    const raw = 'RTBhc2RmZ2hqa2wxMjM0NTY3ODkw';
    const res = await consumeClaim({ kind: 'token', value: raw }, 'owner@example.com');
    assert.equal(res.ok, true);

    const upd = CALLS.find((c: { sql: string }) => /update owner_claim_tokens/i.test(c.sql));
    assert.match(upd.sql, /token_hash = \$1/);
    assert.doesNotMatch(upd.sql, /\bid\s*=\s*\$/);
    assert.equal(upd.params[0], createHash('sha256').update(raw).digest('hex'));
    assert.equal(upd.params[0], hashToken(raw));
    // the raw secret is never sent to the database
    assert.ok(!JSON.stringify(CALLS).includes(raw), 'raw token must not appear in any statement');
  });

  test('REGRESSION: the old exploit shape (a bare row id) claims nothing', async () => {
    // This is exactly what the vulnerable build accepted: any signed-in user POSTing the server
    // action with 1, 2, 3... and taking ownership of every unclaimed listing.
    for (const attempt of [1, 2, 3, 42]) {
      __reset();
      __setResponses([
        {},
        { rowCount: 0, rows: [] }, // no row matches, because the id is not a secret we accept
        {},
      ]);
      const res = await consumeClaim(
        { kind: 'code', value: String(attempt) } as never,
        'attacker@example.com'
      );
      assert.equal(res.ok, false, `id ${attempt} must not be claimable`);

      const upd = CALLS.find((c: { sql: string }) => /update owner_claim_tokens/i.test(c.sql));
      // The number is bound as a CODE string, so it can only ever match a token whose printed code
      // is literally "42". It can never address a row by its primary key.
      assert.doesNotMatch(upd.sql, /\bid\s*=\s*\$/);
      assert.equal(upd.params[0], String(attempt));
    }
  });

  test('an empty or whitespace secret is refused without touching the database', async () => {
    for (const value of ['', '   ', null as unknown as string, undefined as unknown as string]) {
      __reset();
      const res = await consumeClaim({ kind: 'token', value }, 'attacker@example.com');
      assert.equal(res.ok, false);
      assert.equal(CALLS.length, 0, 'no SQL should run for an empty secret');
    }
  });
});

/* ------------------------------------------------------------------------------------------- */
/* HIGH: JSON-LD must not be able to close its own <script> element.                             */
/* ------------------------------------------------------------------------------------------- */
describe('ldJson', () => {
  const PAYLOADS = [
    '</script><img src=x onerror=alert(1)>',
    '</ScRiPt ><script>alert(document.cookie)</script>',
    'normal review, great tacos </script>',
    '<!--<script>',
  ];

  test('no payload can produce a closing script tag', () => {
    for (const p of PAYLOADS) {
      const out = ldJson({ '@type': 'Review', reviewBody: p, author: { name: p } });
      assert.ok(!/<\/script/i.test(out), `"${p}" escaped the script element`);
      assert.ok(!out.includes('<'), 'no raw < should survive at all');
    }
  });

  test('escaping is lossless: Google still reads the original string', () => {
    for (const p of PAYLOADS) {
      const value = { '@type': 'Review', reviewBody: p };
      assert.deepEqual(JSON.parse(ldJson(value)), value);
    }
  });

  test('U+2028 / U+2029 are escaped', () => {
    const LS = '\u2028', PS = '\u2029';
    const body = `line one${LS}line two${PS}end`;
    const out = ldJson({ body });
    assert.ok(!out.includes(LS) && !out.includes(PS), 'raw line separators must not survive');
    assert.equal(JSON.parse(out).body, body);
  });

  test('ordinary content is untouched', () => {
    const v = { name: "Cielo Rojo", rating: 4.6, tags: ['tacos', 'patio'] };
    assert.deepEqual(JSON.parse(ldJson(v)), v);
  });
});

/* ------------------------------------------------------------------------------------------- */
/* Owner-supplied links.                                                                        */
/* ------------------------------------------------------------------------------------------- */
describe('safeUrl', () => {
  test('rejects every non-http(s) scheme', () => {
    for (const bad of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      '  javascript:alert(1)  ',
    ]) {
      assert.equal(safeUrl(bad), null, `${bad} must be refused`);
    }
  });

  test('accepts real links and assumes https for a bare domain', () => {
    assert.equal(safeUrl('https://tacos.com/menu'), 'https://tacos.com/menu');
    assert.equal(safeUrl('http://tacos.com/'), 'http://tacos.com/');
    assert.equal(safeUrl('tacos.com'), 'https://tacos.com/');
  });

  test('rejects empty and hostless values', () => {
    assert.equal(safeUrl(''), null);
    assert.equal(safeUrl(null), null);
    assert.equal(safeUrl('https://localhost'), null);
  });
});

/* ------------------------------------------------------------------------------------------- */
/* Shared secrets.                                                                              */
/* ------------------------------------------------------------------------------------------- */
describe('secretEq', () => {
  test('matches only the exact secret', () => {
    assert.equal(secretEq('s3cret', 's3cret'), true);
    assert.equal(secretEq('s3cret', 's3crey'), false);
    assert.equal(secretEq('s3cret', 's3cre'), false);
    assert.equal(secretEq('s3cret', 's3cret '), false);
  });

  test('never authenticates a missing secret', () => {
    assert.equal(secretEq('', ''), false);
    assert.equal(secretEq(undefined, undefined), false);
    assert.equal(secretEq('anything', undefined), false);
    assert.equal(secretEq(null, 'anything'), false);
  });

  test('a length mismatch does not throw (it would be a length oracle)', () => {
    assert.doesNotThrow(() => secretEq('a', 'a-very-much-longer-secret-value'));
  });
});

/* ------------------------------------------------------------------------------------------- */
/* Rate limiting.                                                                               */
/* ------------------------------------------------------------------------------------------- */
describe('rateLimit', () => {
  beforeEach(() => __resetRateLimits());

  test('allows exactly the limit, then refuses', () => {
    for (let i = 0; i < 5; i++) {
      assert.equal(rateLimit('k', 5, 60_000).ok, true, `call ${i + 1} should pass`);
    }
    const over = rateLimit('k', 5, 60_000);
    assert.equal(over.ok, false);
    assert.ok(over.retryAfter > 0, 'a refusal should say when to come back');
  });

  test('keys are independent', () => {
    for (let i = 0; i < 5; i++) rateLimit('a', 5, 60_000);
    assert.equal(rateLimit('a', 5, 60_000).ok, false);
    assert.equal(rateLimit('b', 5, 60_000).ok, true);
  });

  test('the window expires', async () => {
    assert.equal(rateLimit('w', 1, 20).ok, true);
    assert.equal(rateLimit('w', 1, 20).ok, false);
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(rateLimit('w', 1, 20).ok, true, 'a new window should reset the count');
  });

  test('the claim budget is small enough to make guessing LLG-XXXX hopeless', () => {
    // 4 chars from a 31-letter alphabet is ~923k codes. At 20 tries/hour per IP, an attacker needs
    // millions of hours per address; the point of the test is that the budget stays small.
    let allowed = 0;
    for (let i = 0; i < 500; i++) if (rateLimit('claim:i:1.2.3.4', 20, 3_600_000).ok) allowed++;
    assert.equal(allowed, 20);
  });
});

/* ------------------------------------------------------------------------------------------- */
/* SSRF guard on the scraper.                                                                   */
/* ------------------------------------------------------------------------------------------- */
describe('isPublicHttpUrl', () => {
  test('refuses loopback, private ranges and cloud metadata', () => {
    for (const bad of [
      'http://127.0.0.1/',
      'http://localhost:3000/',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.5/',
      'http://192.168.1.1/',
      'http://172.16.0.9/',
      'http://172.31.255.255/',
      'http://[::1]/',
      'http://0.0.0.0/',
      'http://db.internal/',
      'file:///etc/passwd',
      'gopher://evil/',
    ]) {
      assert.equal(isPublicHttpUrl(bad), false, `${bad} must be refused`);
    }
  });

  test('allows ordinary public sites', () => {
    for (const ok of ['https://tacos.com', 'http://example.org/happy-hour', 'tacos.com', 'https://8.8.8.8/']) {
      assert.equal(isPublicHttpUrl(ok), true, `${ok} should be allowed`);
    }
  });

  test('public ranges adjacent to private ones are still allowed', () => {
    assert.equal(isPublicHttpUrl('http://172.15.0.1/'), true);
    assert.equal(isPublicHttpUrl('http://172.32.0.1/'), true);
    assert.equal(isPublicHttpUrl('http://11.0.0.1/'), true);
  });
});

/* ------------------------------------------------------------------------------------------- */
/* IP pseudonymisation.                                                                         */
/* ------------------------------------------------------------------------------------------- */
describe('hashIp', () => {
  test('never returns the address itself', () => {
    process.env.IP_HASH_KEY = 'test-key';
    const out = hashIp('203.0.113.9');
    assert.ok(out && !out.includes('203.0.113.9'));
    assert.match(out, /^[a-f0-9]{32}$/);
  });

  test('is stable, and distinct per address', () => {
    process.env.IP_HASH_KEY = 'test-key';
    assert.equal(hashIp('203.0.113.9'), hashIp('203.0.113.9'));
    assert.notEqual(hashIp('203.0.113.9'), hashIp('203.0.113.10'));
  });

  test('is keyed, so the value is not a plain reversible digest', () => {
    process.env.IP_HASH_KEY = 'key-one';
    const a = hashIp('203.0.113.9');
    process.env.IP_HASH_KEY = 'key-two';
    assert.notEqual(a, hashIp('203.0.113.9'));
  });

  test('stores nothing rather than something reversible when unkeyed', () => {
    delete process.env.IP_HASH_KEY;
    delete process.env.AUTH_SECRET;
    assert.equal(hashIp('203.0.113.9'), null);
    assert.equal(hashIp(''), null);
    assert.equal(hashIp(null), null);
  });
});
