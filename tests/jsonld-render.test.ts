import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { restaurantLdMain, readerRatingLd, ldJson, MIN_REVIEWS_FOR_RATING } from '@/lib/seo';
import type { Spot } from '@/lib/spots';

/**
 * The reported vulnerability, end to end.
 *
 * Not a test of ldJson() in isolation: this runs the real production path a public spot page runs,
 * restaurantLdMain(spot, reviews) -> readerRatingLd() -> the string that goes into
 * dangerouslySetInnerHTML, with a hostile review body sitting in the database exactly as an
 * approved reader review would.
 */

const PAYLOAD = '</script><img src=x onerror=alert(document.domain)>';

// Only the fields restaurantLdMain actually reads. Cast, because building a whole Spot here would
// test the fixture rather than the code.
const spot = {
  slug: 'cielo-rojo',
  name: 'Cielo Rojo',
  website: null,
  cuisines: [],
  priceTier: null,
  phone: null,
  localPhotos: [],
  photo: null,
  menuData: null,
  menuUrl: null,
  addressLine: '123 Main St, Leander, TX 78641',
  facilities: [],
  amenities: [],
  open24: false,
  periods: [],
} as unknown as Spot;

function reviewsWith(body: string) {
  return {
    avg: 4.7,
    count: MIN_REVIEWS_FOR_RATING,
    list: [
      { stars: 5, body, who: 'jane' },
      { stars: 5, body: 'Genuinely good tacos.', who: 'sam' },
      { stars: 4, body: 'Solid.', who: 'alex' },
    ],
  };
}

describe('spot page JSON-LD (the real render path)', () => {
  test('a hostile review body cannot close the script element', () => {
    const emitted = ldJson(restaurantLdMain(spot, reviewsWith(PAYLOAD)));

    assert.ok(!/<\/script/i.test(emitted), 'the payload closed the <script> element');
    assert.ok(!emitted.includes('<'), 'a raw < reached the page');
    // and the review really is in there (otherwise this test proves nothing)
    assert.ok(emitted.includes('u003c/script'), 'expected the payload, escaped, in the output');
  });

  test('a hostile AUTHOR NAME is escaped too', () => {
    const reviews = reviewsWith('fine');
    reviews.list[0].who = PAYLOAD;
    const emitted = ldJson(restaurantLdMain(spot, reviews));
    assert.ok(!/<\/script/i.test(emitted));
  });

  test('the escaped document still parses to the original review text', () => {
    const emitted = ldJson(restaurantLdMain(spot, reviewsWith(PAYLOAD)));
    const parsed = JSON.parse(emitted) as { review?: { reviewBody?: string }[] };
    const bodies = (parsed.review || []).map((r) => r.reviewBody);
    assert.ok(bodies.includes(PAYLOAD), 'Google must still read the exact original string');
  });

  test('readerRatingLd stays silent below the review threshold', () => {
    const thin = { avg: 5, count: MIN_REVIEWS_FOR_RATING - 1, list: [{ stars: 5, body: PAYLOAD, who: 'x' }] };
    assert.deepEqual(readerRatingLd(thin), {});
  });
});
