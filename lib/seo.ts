import type { Spot } from '@/lib/spots';

// Search-result snippets. These exist to win the click in the SERP, which is a different
// job from the on-page editorial: we sit next to Google's own star panel, so repeating a
// star rating wastes characters. We sell the one thing the panel can't show, an opinion,
// and back it with a specific dish.
//
// Nothing here writes to the DB. `hook` is the on-site card teaser and stays untouched;
// the snippet is COMPOSED from verdict + whatToOrder + gotcha at render time.

const BRAND = 'Leander Local Guide';
const TRUST = 'No sponsors, no pay-to-play.';
const TITLE_MAX = 62; // ~what Google renders before truncating
const DESC_MAX = 160;

// House rule: no em/en dashes anywhere (lib/spots.ts clean() strips them on read, app/actions.ts
// on write). Our own literals must obey it too, and Google's editorialSummary can smuggle one in.
const noDash = (s: string) => s.replace(/[ \t]*[—–][ \t]*/g, ', ').replace(/[—–]/g, '-');

// Verdict -> the label in the <title>.
// SKIP IT is deliberately absent. The page still stamps SKIP IT loud and unmissable; the search
// result stays neutral so an owner googling themselves doesn't meet the pan in the shop window.
// The claim below still tells the truth, it just leads with the specific detail instead of the pan.
const TITLE_VERDICT: Record<string, string> = {
  'WORTH THE GRAVEL': 'Worth the Gravel',
  'WORTH IT': 'Worth It',
  SOLID: 'Solid',
  "IT'S FINE": "It's Fine",
};

// Verdict -> the opening claim of the description, in our voice.
// Two sets, because 193 of our 197 spots are not yet visited in person: their verdict is drawn
// from what Leander reviewers say, so the claim says so rather than implying Anthony ate there.
const CLAIM_VISITED: Record<string, string> = {
  'WORTH THE GRAVEL': 'Worth the drive.',
  'WORTH IT': 'Worth it.',
  SOLID: 'Solid, and here is why.',
  "IT'S FINE": 'It is fine, and we will say so.',
};
const CLAIM_REVIEWED: Record<string, string> = {
  'WORTH THE GRAVEL': 'Worth the drive, going by the reviews.',
  'WORTH IT': 'Worth it, going by the reviews.',
  SOLID: 'Solid, going by the reviews.',
  "IT'S FINE": 'Fine, going by the reviews.',
};

/** Smallest number of characters worth spending on a fragment. Below this we say nothing. */
const MIN_FRAGMENT = 32;

// Words a sentence must never end on. "Reviewers point to the Tandoori Chicken, and the." reads
// like a bug, because it is one: a naive word-boundary cut leaves the reader mid-thought.
const DANGLING = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'with', 'then', 'of', 'for', 'to', 'in', 'on', 'at', 'by',
  'from', 'its', 'it', 'plus', 'that', 'this', 'as', 'so', 'their', 'his', 'her', 'your', 'our',
  'is', 'are', 'was', 'were', 'be', 'been', 'just', 'also', 'while', 'when', 'if', 'into', 'over',
  'under', 'about', 'up', 'out', 'off', 'per', 'via', 'plus',
]);

/**
 * As many whole sentences as fit. Truncating is the last resort, not the default: a snippet that
 * ends on a complete thought is worth more than one that squeezes in three more words.
 */
function lead(s: string | null, max: number): string {
  if (!s || max < MIN_FRAGMENT) return ''; // a 10-char budget yields "The." Say nothing instead.
  const txt = noDash(s).trim();
  const parts = (txt.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [txt]).map((p) => p.trim()).filter(Boolean);

  let out = '';
  for (const p of parts) {
    const next = out ? `${out} ${p}` : p;
    if (next.length > max) break;
    out = next;
  }
  if (out) return out; // whole sentences fit: nothing to truncate, nothing to dangle

  return clip(parts[0] || txt, max); // even one sentence is too long, so cut it gracefully
}

/**
 * A shorter name for when the full one won't fit a title. Trims the location parenthetical and
 * anything after a separator: "Wagyu On Wheels - The Fieldhouse @ The Crossover" -> "Wagyu On Wheels".
 * Only used as a fallback, and never allowed to shrink to a stub.
 */
function shortName(name: string): string {
  const base = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const cut = base.split(/\s+[-:@|]\s+/)[0].trim();
  return cut.length >= 6 ? cut : base || name;
}

/** First variant that fits, else the last (shortest) one. The verdict never gets dropped. */
function fit(variants: string[]): string {
  return variants.find((v) => v.length <= TITLE_MAX) ?? variants[variants.length - 1];
}

/**
 * Cut a too-long sentence so it still reads like a sentence.
 *
 * Prefer a clause boundary (a comma), because ending on a complete clause sounds deliberate.
 * Otherwise fall back to a word boundary, then peel off any trailing connective words, so we never
 * ship "...and the." into a search result.
 */
function clip(s: string, max: number): string {
  const txt = s.trim();
  if (txt.length <= max) return txt;

  const head = txt.slice(0, max);
  const comma = Math.max(head.lastIndexOf(', '), head.lastIndexOf('; '));
  const space = head.lastIndexOf(' ');
  // Only honour a comma that lands somewhere useful; a comma at character 8 of 130 is not a clause.
  const cut = comma > max * 0.5 ? head.slice(0, comma) : head.slice(0, space > 0 ? space : max);

  const words = cut.split(/\s+/);
  while (words.length > 1 && DANGLING.has(words[words.length - 1].toLowerCase().replace(/[^a-z']/g, ''))) {
    words.pop();
  }
  return `${words.join(' ').replace(/[,;:.\s]+$/, '')}.`;
}

/** Make sure a fragment reads as a sentence. */
const sentence = (s: string) => (s && !/[.!?]$/.test(s) ? `${s}.` : s);

/** The first complete sentence, or '' if there isn't one. Never truncates. */
function firstSentence(s: string | null): string {
  if (!s) return '';
  const m = noDash(s).trim().match(/[^.!?]+[.!?]+|[^.!?]+$/);
  return m ? sentence(m[0].trim()) : '';
}

export function titleVerdict(spot: Spot): string | null {
  if (spot.comingSoon) return 'Opening Soon';
  const v = (spot.verdict || '').toUpperCase();
  // Not gated on `visited`: the verdict is already the stamp on every card site-wide, and the
  // detail page now shows it too. SKIP IT and anything unmapped return null, so the title just
  // reads "{Name} Reviews" and stays neutral.
  return TITLE_VERDICT[v] ?? null;
}

/**
 * The <title>. Echoes "Reviews" because that is literally the winning query, and leads with
 * the verdict because nobody else in the results has an opinion. Drops the brand rather than
 * the verdict when we run out of room; Google appends the site name from Organization schema.
 */
export function snippetTitle(spot: Spot): string {
  const v = titleVerdict(spot);
  const tail = v ? `, ${v}` : '';
  const long = noDash(spot.name);
  const short = shortName(long);
  // Degrade in this order: give up the brand before the name, and the name's tail before the
  // verdict. Google appends the site name itself from our Organization schema, so losing the
  // brand suffix costs little; losing the verdict costs the whole point of the change.
  return fit([
    `${long} Reviews${tail} | ${BRAND}`,
    `${long} Reviews${tail}`,
    `${short} Reviews${tail} | ${BRAND}`,
    `${short} Reviews${tail}`,
  ]);
}

/**
 * The <meta description>. {Claim}. {Specific detail}. {Trust line}
 * Specificity is the whole pitch: "the paneer burger and fried rice" beats "great Indian food".
 */
export function snippetDescription(spot: Spot): string {
  const name = noDash(spot.name);
  const v = (spot.verdict || '').toUpperCase();
  const skip = v === 'SKIP IT';
  const table = spot.visited ? CLAIM_VISITED : CLAIM_REVIEWED;

  const claim = spot.comingSoon
    ? `${name} is not open yet. Here is what we know.`
    : skip
      ? `Our honest read on ${name}.` // truthful, but the pan stays on the page, not in the SERP
      : (table[v] ?? `An honest local read on ${name}.`);

  // Reserve room for the trust line so the brand differentiator survives the truncation.
  const room = DESC_MAX - claim.length - TRUST.length - 2;

  // Lead with the dish. For a pan, lead with the reason, since that is the specific thing.
  const primary = skip
    ? spot.gotcha || spot.whatToOrder || spot.hook || spot.summary
    : spot.whatToOrder || spot.hook || spot.summary || spot.gotcha;

  let detail = sentence(lead(primary, Math.max(room, 40)));

  // If there is still real room, the caveat earns its place: it is the honesty signal, and it gives
  // Google a second phrase to bold when the query is not the one we guessed.
  //
  // It goes in WHOLE or not at all. A half-caveat is worse than no caveat: truncating it is how we
  // ended up shipping "Service can buckle when it's." to a quarter of the site.
  if (!skip && spot.whatToOrder && spot.gotcha) {
    const extra = firstSentence(spot.gotcha);
    if (extra && detail.length + extra.length + 1 <= room) detail = `${detail} ${extra}`;
  }

  const parts = [claim, detail].filter(Boolean);
  const body = parts.join(' ');
  return body.length + TRUST.length + 1 <= DESC_MAX ? `${body} ${TRUST}` : clip(body, DESC_MAX);
}

export function snippetFor(spot: Spot): { title: string; description: string } {
  return { title: snippetTitle(spot), description: snippetDescription(spot) };
}

/**
 * The menu page. "[restaurant] menu" is a big slice of our impressions. We will never beat the
 * restaurant's own menu on the head term, but a chunk of those searchers are really asking
 * "what should I order here?", and that is the one question we answer better than anyone.
 */
export function menuSnippet(spot: Spot, dishes: number, sections: string[]): { title: string; description: string } {
  const name = noDash(spot.name);
  const short = shortName(name);
  const title = fit([
    `${name} Menu with Prices | ${BRAND}`,
    `${name} Menu with Prices, Leander TX`,
    `${name} Menu with Prices`,
    `${short} Menu with Prices, Leander TX`,
    `${short} Menu with Prices`,
  ]);

  const head = `The full ${name} menu, ${dishes} dishes with prices, typed up and searchable.`;
  const order = spot.whatToOrder ? sentence(lead(spot.whatToOrder, DESC_MAX - head.length - 2)) : '';
  const body = order
    ? `${head} What to order: ${order}`
    : `${head} Photographed in person in Leander, TX${sections.length ? `, across ${noDash(sections.slice(0, 3).join(', '))}` : ''}.`;
  return { title, description: clip(body, DESC_MAX) };
}

// Google's day numbering in the Places payload is 0 = Sunday. schema.org wants names.
const SCHEMA_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hhmm = (mins: number) => `${String(Math.floor((mins % 1440) / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/**
 * The facts about the place, as structured data.
 *
 * We render hours, a phone number, a patio, dog-friendliness and whether they take reservations all
 * over the page, and NONE of it reached the JSON-LD. openingHoursSpecification is a documented
 * LocalBusiness property and one of the few Google actually reads for local results, and we were
 * simply not emitting it.
 *
 * Everything here is a fact we can point at on the page. No invented properties: schema.org has no
 * breakfast/lunch/dinner concept, so the meal-time tags stay on the page and out of the markup
 * rather than being crowbarred into something that means something else.
 */
export function facilitiesLd(spot: Spot): object {
  const out: Record<string, unknown> = {};

  // Hours. spot.periods is [openAbs, closeAbs] in minutes from Sunday 00:00, and a close that wraps
  // past the end of the week has had 10080 added to it, so mask it back before reading the day.
  if (spot.open24) {
    out.openingHoursSpecification = [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: SCHEMA_DAYS.map((d) => `https://schema.org/${d}`),
      opens: '00:00',
      closes: '23:59',
    }];
  } else if (spot.periods.length) {
    out.openingHoursSpecification = spot.periods.map(([openAbs, closeAbs]) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${SCHEMA_DAYS[Math.floor(openAbs / 1440) % 7]}`,
      opens: hhmm(openAbs),
      closes: hhmm(closeAbs % 10080),
    }));
  }

  if (spot.amenities.includes('Reservations')) out.acceptsReservations = true;
  if (spot.amenities.includes('Dog-Friendly')) out.petsAllowed = true;

  // The rest of the amenities, as the schema.org type that exists for exactly this.
  const feature = spot.amenities.filter((a) => a !== 'Dog-Friendly' && a !== 'Reservations');
  if (feature.length) {
    out.amenityFeature = feature.map((name) => ({
      '@type': 'LocationFeatureSpecification',
      name,
      value: true,
    }));
  }

  return out;
}

/** What getReviews() in lib/spots.ts returns. The ONLY thing allowed to become a star rating. */
export type ReaderReviews = {
  avg: number | null;
  count: number;
  list: { stars: number; body: string | null; who: string }[];
};

/** Below this, an average is noise, and Google does not want it either. */
export const MIN_REVIEWS_FOR_RATING = 3;

/**
 * The ONLY place in this codebase allowed to emit a star rating. The eslint config forbids
 * `aggregateRating` and `reviewRating` anywhere else, on purpose.
 *
 * Google's review-snippet rules for local businesses are not a style preference:
 *   "Ratings must be sourced directly from users."
 *   "Don't rely on human editors to create, curate, or compile ratings information for local
 *    businesses."
 *
 * So this function takes reader reviews and NOTHING ELSE. It cannot be handed a Spot, so it cannot
 * be handed a verdict, so nobody can quietly turn our editorial call back into a star rating. Both
 * of the things that used to live here (Google's own star average, and our AI-compiled verdict)
 * were ineligible for the star feature they were reaching for, and a manual-action risk.
 *
 * Returns {} until three readers have weighed in, so it spreads across the site on its own as
 * reviews land. No code change, no manual step: see lib/revalidate.ts for the cache busting that
 * makes an approved review show up immediately.
 */
export function readerRatingLd(reviews: ReaderReviews): object {
  if (reviews.avg == null || reviews.count < MIN_REVIEWS_FOR_RATING) return {};
  return {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: reviews.avg,
      reviewCount: reviews.count,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.list.slice(0, 10).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.who },
      reviewRating: { '@type': 'Rating', ratingValue: r.stars, bestRating: 5, worstRating: 1 },
      ...(r.body ? { reviewBody: r.body } : {}),
    })),
  };
}

/**
 * FAQ structured data.
 *
 * IMPORTANT, and not what you would expect: this earns NOTHING in Google Search. Google deprecated
 * the FAQ rich result (gone from results since 7 May 2026, docs pulled 15 June 2026). It will not
 * win a People Also Ask box, and it is not a ranking signal.
 *
 * It is kept because the answer engines still read it, and this site deliberately courts them:
 * app/robots.ts explicitly welcomes GPTBot, ClaudeBot, PerplexityBot and friends. "What should I
 * order at X" is exactly the question those engines get asked, and this hands them our answer,
 * already parsed. If that stops being worth ~1KB a page, delete this and its two call sites.
 *
 * Built from the same fields as the snippet, so it never invents an answer: a question is emitted
 * only when we actually have the copy to answer it.
 */
export function faqLd(spot: Spot, url: string): object | null {
  const qa: { q: string; a: string }[] = [];
  const name = noDash(spot.name);

  if (spot.whatToOrder) qa.push({ q: `What should I order at ${name}?`, a: noDash(spot.whatToOrder) });

  if (spot.verdict) {
    const v = spot.verdict.toUpperCase();
    const lede =
      v === 'SKIP IT' ? 'We would skip this one.'
        : v === 'WORTH THE GRAVEL' ? 'Yes, and it is worth the drive.'
          : v === "IT'S FINE" ? 'It is fine, not a destination.'
            : 'Yes.';
    // Say where the call came from. On 193 of 197 spots it is the reviewers, not a visit.
    const src = spot.visited ? '' : ' That is the word from Leander reviewers, not a visit of our own yet.';
    const why = spot.hook ? ` ${sentence(noDash(spot.hook))}` : '';
    qa.push({ q: `Is ${name} worth it?`, a: `${lede}${why}${src}` });
  }

  if (spot.gotcha) qa.push({ q: `Anything to know before going to ${name}?`, a: noDash(spot.gotcha) });

  if (qa.length < 2) return null; // a one-question FAQ is not worth the markup
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: qa.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
