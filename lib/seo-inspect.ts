import { pool } from './db';
import { getSpotAny, getAllSpots, getReviews, type Spot } from './spots';
import { getEventsForSpot, type SpotEvent } from './events';
import { BOARDS } from './boards';
import {
  snippetFor, menuSnippet, faqLd, ogMain, ogMenu,
  restaurantLdMain, breadcrumbLdMain, eventsLd, restaurantLdMenu, breadcrumbLdMenu,
  snippetChecks, MIN_REVIEWS_FOR_RATING, SITE_URL, type SnippetCheck, type ReaderReviews,
} from './seo';

// The SEO desk (/admin/seo). Everything a page hands Google, reconstructed from the SAME code the
// page ships (lib/seo.ts builders), so the preview is not an approximation of the live page: it IS
// the live page's output. Editing lives in editorial.seo* via saveSeoOverrides (app/actions.ts).

export type Lint = { level: 'error' | 'warn' | 'info'; msg: string };
export type JsonLdBlock = { type: string; label: string; plain: string; raw: unknown };
export type RichResult = { name: string; status: 'eligible' | 'not-eligible' | 'info'; reason: string };
export type DupHit = { field: 'title' | 'description'; slug: string; name: string; page: 'main' | 'menu' };

export type SerpPage = {
  key: 'main' | 'menu';
  label: string;
  path: string;
  url: string;
  // The resolved snippet (what actually ships = override or auto), plus the auto and the override.
  title: string;
  titleAuto: string;
  titleOverride: string | null;
  description: string;
  descriptionAuto: string;
  descriptionOverride: string | null;
  canonical: string;
  robots: string;
  h1: string;
  siteName: string;
  breadcrumb: string;        // "leanderlocalguide.com › r › cielo-rojo"
  og: { title: string; description: string; image: string | null; type: string };
  twitter: { card: string; title: string; description: string } | null;
  rating: { eligible: boolean; value: number | null; count: number; reason: string };
  jsonLd: JsonLdBlock[];
  richResults: RichResult[];
  inSitemap: boolean;
  robotsTxtAllowed: boolean;
  checks: SnippetCheck[];    // live snippet lints on the resolved copy
  page: Lint[];              // page-level lints (indexability, duplicates)
  duplicates: DupHit[];
};

export type InspectResult = { slug: string; name: string; hidden: boolean; pages: SerpPage[] };

// robots.txt disallow prefixes for the default (`*`) crawler group, mirrored from app/robots.ts.
// Public content lives outside these, so a spot or board page is always allowed.
const DISALLOW = ['/admin', '/api/', '/contribute/', '/uploads/', '/ticket/'];
const robotsAllows = (path: string) => !DISALLOW.some((d) => path === d || path.startsWith(d));

const crumb = (path: string) => `leanderlocalguide.com${path === '/' ? '' : ' › ' + path.replace(/^\//, '').split('/').join(' › ')}`;

/** Plain-English "what this tells Google" for one JSON-LD node. */
function plainFor(raw: Record<string, unknown>): { type: string; label: string; plain: string } {
  const type = String(raw['@type'] || 'Thing');
  switch (type) {
    case 'Restaurant': {
      const bits: string[] = [`A restaurant named "${raw.name}"`];
      const addr = raw.address as Record<string, string> | undefined;
      if (addr?.streetAddress) bits.push(`at ${addr.streetAddress}, ${addr.addressLocality} ${addr.addressRegion}`);
      if (raw.servesCuisine) bits.push(`serving ${(raw.servesCuisine as string[]).join(', ')}`);
      if (raw.priceRange) bits.push(`price ${raw.priceRange}`);
      const extras: string[] = [];
      if (raw.telephone) extras.push('phone');
      if (raw.openingHoursSpecification) extras.push('opening hours');
      if (raw.acceptsReservations) extras.push('takes reservations');
      if (raw.petsAllowed) extras.push('dog friendly');
      if (raw.menu) extras.push('a menu link');
      if (raw.aggregateRating) {
        const ar = raw.aggregateRating as Record<string, unknown>;
        extras.push(`a ${ar.ratingValue}★ rating from ${ar.reviewCount} local reviews (this is what can produce review stars)`);
      }
      let plain = bits.join(' ') + '.';
      if (extras.length) plain += ` Also reports ${extras.join(', ')}.`;
      return { type, label: 'Restaurant (LocalBusiness)', plain };
    }
    case 'BreadcrumbList': {
      const items = (raw.itemListElement as Record<string, unknown>[] || []).map((i) => i.name).join(' › ');
      return { type, label: 'BreadcrumbList', plain: `The breadcrumb trail Google can show under the result: ${items}.` };
    }
    case 'FAQPage': {
      const n = (raw.mainEntity as unknown[] || []).length;
      return { type, label: 'FAQPage', plain: `${n} question/answer pairs. Note: Google retired the FAQ rich result in May 2026, so this earns nothing in Search. It is kept only so AI answer engines (ChatGPT, Perplexity, Google AI) can read our answers.` };
    }
    case 'Menu': {
      const secs = (raw.hasMenuSection as unknown[] || []).length;
      return { type, label: 'Menu', plain: `A full menu with ${secs} sections and per-dish prices. This is entity markup for AI and Maps; Google Search has no dedicated menu rich result, so it will not render a menu card.` };
    }
    default:
      return { type, label: type, plain: `A ${type} node.` };
  }
}

function blocks(raws: unknown[]): JsonLdBlock[] {
  const out: JsonLdBlock[] = [];
  for (const raw of raws) {
    if (Array.isArray(raw)) {
      // An array of Events shares one <script>. Summarise the group, keep the raw array.
      const events = raw as Record<string, unknown>[];
      out.push({
        type: 'Event',
        label: `Event × ${events.length}`,
        plain: events.map((e) => `"${e.name}" on ${String(e.startDate || '').slice(0, 10)}`).join('; ') + '. Eligible for the event experience in Search and Maps.',
        raw,
      });
    } else {
      const r = raw as Record<string, unknown>;
      out.push({ ...plainFor(r), raw });
    }
  }
  return out;
}

function bare(spot: Spot): Spot {
  return { ...spot, seoTitle: null, seoDescription: null, seoTitleMenu: null, seoDescriptionMenu: null };
}

function dupCheck(field: 'title' | 'description', value: string, self: string, all: { slug: string; name: string; page: 'main' | 'menu'; title: string; description: string }[]): DupHit[] {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const v = norm(value);
  if (!v) return [];
  return all
    .filter((o) => o.slug !== self && norm(o[field]) === v)
    .map((o) => ({ field, slug: o.slug, name: o.name, page: o.page }));
}

function ratingBits(reviews: ReaderReviews): SerpPage['rating'] {
  const eligible = reviews.avg != null && reviews.count >= MIN_REVIEWS_FOR_RATING;
  return {
    eligible,
    value: reviews.avg,
    count: reviews.count,
    reason: eligible
      ? `${reviews.count} approved local reviews (average ${reviews.avg}★). Eligible for review stars; Google still decides per query.`
      : `${reviews.count} of ${MIN_REVIEWS_FOR_RATING} local reviews needed. No rating is emitted, and no stars will show. This is expected, not a bug: we never turn a verdict into a star rating.`,
  };
}

export async function inspectSpot(slug: string): Promise<InspectResult | null> {
  const spot = await getSpotAny(slug);
  if (!spot) return null;

  const [reviews, events, allSpots, meta] = await Promise.all([
    getReviews(slug),
    getEventsForSpot(slug),
    getAllSpots(),
    pool.query(`select hidden, (menu is not null and jsonb_array_length(coalesce(menu->'sections','[]'::jsonb)) > 0) as has_menu from restaurants where slug = $1`, [slug]),
  ]);
  const hidden = !!meta.rows[0]?.hidden;

  // Every other spot's snippets, both pages, for exact-duplicate detection across the whole site.
  const others: { slug: string; name: string; page: 'main' | 'menu'; title: string; description: string }[] = [];
  for (const s of allSpots) {
    const m = snippetFor(s);
    others.push({ slug: s.slug, name: s.name, page: 'main', title: m.title, description: m.description });
    if (s.menuData) {
      const items = s.menuData.sections.reduce((a, sec) => a + sec.items.length, 0);
      const mm = menuSnippet(s, items, s.menuData.sections.map((x) => x.name));
      others.push({ slug: s.slug, name: s.name, page: 'menu', title: mm.title, description: mm.description });
    }
  }

  const pages: SerpPage[] = [buildMain(spot, reviews, events, hidden, others)];
  if (spot.menuData) pages.push(buildMenu(spot, hidden, !!meta.rows[0]?.has_menu, others));
  return { slug, name: spot.name, hidden, pages };
}

function pageLints(hidden: boolean, inSitemap: boolean, duplicates: DupHit[]): Lint[] {
  const out: Lint[] = [];
  if (hidden) out.push({ level: 'error', msg: 'This spot is hidden, so the public page returns 404 and Google cannot index it.' });
  else if (!inSitemap) out.push({ level: 'warn', msg: 'This page is not in sitemap.xml, so Google may be slow to find it.' });
  if (duplicates.some((d) => d.field === 'title')) out.push({ level: 'warn', msg: 'Another page has the exact same title. Duplicate titles compete with each other in Search.' });
  if (duplicates.some((d) => d.field === 'description')) out.push({ level: 'warn', msg: 'Another page has the exact same description. Give each page its own.' });
  return out;
}

function buildMain(spot: Spot, reviews: ReaderReviews, events: SpotEvent[], hidden: boolean, others: { slug: string; name: string; page: 'main' | 'menu'; title: string; description: string }[]): SerpPage {
  const path = `/r/${spot.slug}`;
  const auto = snippetFor(bare(spot));
  const resolved = snippetFor(spot);
  const og = ogMain(spot, resolved.description);

  const faq = faqLd(spot, `${SITE_URL}${path}`);
  const evLd = eventsLd(spot, events);
  const raws: unknown[] = [restaurantLdMain(spot, reviews), breadcrumbLdMain(spot)];
  if (faq) raws.push(faq);
  if (evLd.length) raws.push(evLd);

  const rating = ratingBits(reviews);
  const richResults: RichResult[] = [
    { name: 'Review stars', status: rating.eligible ? 'eligible' : 'not-eligible', reason: rating.reason },
    { name: 'Breadcrumb', status: 'eligible', reason: 'Valid BreadcrumbList. Google can show the Home › Food › name trail.' },
    { name: 'FAQ', status: 'info', reason: faq ? 'FAQ markup present, but Google retired FAQ rich results (May 2026). Value is AI answer engines only.' : 'No FAQ markup (needs at least two answerable questions).' },
    { name: 'Event', status: evLd.length ? 'eligible' : 'not-eligible', reason: evLd.length ? `${evLd.length} event(s) with a real date. Eligible for the event result.` : 'No upcoming event with a date, so no event result.' },
  ];

  const duplicates = [
    ...dupCheck('title', resolved.title, spot.slug, others.filter((o) => o.page === 'main')),
    ...dupCheck('description', resolved.description, spot.slug, others.filter((o) => o.page === 'main')),
  ];
  const inSitemap = !hidden;

  return {
    key: 'main', label: 'Main page', path, url: `${SITE_URL}${path}`,
    title: resolved.title, titleAuto: auto.title, titleOverride: spot.seoTitle,
    description: resolved.description, descriptionAuto: auto.description, descriptionOverride: spot.seoDescription,
    canonical: `${SITE_URL}${path}`, robots: hidden ? 'noindex (page 404s)' : 'index, follow',
    h1: spot.name, siteName: 'The Leander Local Guide', breadcrumb: crumb(path),
    og: { title: og.title, description: og.description, image: og.image ?? null, type: og.type },
    twitter: null,
    rating,
    jsonLd: blocks(raws),
    richResults,
    inSitemap, robotsTxtAllowed: robotsAllows(path),
    checks: snippetChecks(resolved.title, resolved.description),
    page: pageLints(hidden, inSitemap, duplicates),
    duplicates,
  };
}

function buildMenu(spot: Spot, hidden: boolean, hasMenu: boolean, others: { slug: string; name: string; page: 'main' | 'menu'; title: string; description: string }[]): SerpPage {
  const path = `/r/${spot.slug}/menu`;
  const m = spot.menuData!;
  const items = m.sections.reduce((a, s) => a + s.items.length, 0);
  const sections = m.sections.map((s) => s.name);
  const auto = menuSnippet(bare(spot), items, sections);
  const resolved = menuSnippet(spot, items, sections);
  const og = ogMenu(spot, resolved.description);

  const richResults: RichResult[] = [
    { name: 'Menu', status: 'info', reason: `${items} dishes in structured data. Feeds AI answer engines and Maps; Google Search has no menu rich result.` },
    { name: 'Breadcrumb', status: 'eligible', reason: 'Valid BreadcrumbList (Home › name › Menu).' },
  ];
  const duplicates = [
    ...dupCheck('title', resolved.title, spot.slug, others.filter((o) => o.page === 'menu')),
    ...dupCheck('description', resolved.description, spot.slug, others.filter((o) => o.page === 'menu')),
  ];
  const inSitemap = !hidden && !!hasMenu;

  return {
    key: 'menu', label: 'Menu page', path, url: `${SITE_URL}${path}`,
    title: resolved.title, titleAuto: auto.title, titleOverride: spot.seoTitleMenu,
    description: resolved.description, descriptionAuto: auto.description, descriptionOverride: spot.seoDescriptionMenu,
    canonical: `${SITE_URL}${path}`, robots: hidden ? 'noindex (page 404s)' : 'index, follow',
    h1: `${spot.name} Menu`, siteName: 'The Leander Local Guide', breadcrumb: crumb(path),
    og: { title: og.title, description: og.description, image: og.image ?? null, type: og.type },
    twitter: og.twitter,
    rating: { eligible: false, value: null, count: 0, reason: 'Menu pages do not carry a rating.' },
    jsonLd: blocks([restaurantLdMenu(spot), breadcrumbLdMenu(spot)]),
    richResults,
    inSitemap, robotsTxtAllowed: robotsAllows(path),
    checks: snippetChecks(resolved.title, resolved.description),
    page: pageLints(hidden, inSitemap, duplicates),
    duplicates,
  };
}

// ---------------------------------------------------------------------------
// Non-restaurant pages, for the picker. Read-only SERP previews. These are a
// mirror of each route's own metadata (kept in sync by hand), shown so the desk
// covers every page type, not just spots.
// ---------------------------------------------------------------------------
export type StaticPageSeo = { key: string; label: string; path: string; title: string; description: string };

export function staticPages(): StaticPageSeo[] {
  const boards = BOARDS.map((b) => ({
    key: `best-${b.slug}`, label: b.title, path: `/best/${b.slug}`,
    title: b.title, description: `${b.blurb} Ranked by The Leander Local Guide, weighted by what locals love.`,
  }));
  return [
    { key: 'home', label: 'Home', path: '/', title: 'The Leander Local Guide · Leander, TX food scene', description: 'A guide to Leander, Texas and its local food scene. By a local, for locals: the hidden gems, the bar where everybody knows your name, and the one dish worth the drive.' },
    { key: 'passport', label: 'The Local Passport', path: '/passport', title: 'The Local Passport: every Leander food perk in one place', description: 'The Local Passport: standing perks straight from Leander owners to people who found them through the guide. Pull the stamp, show it at the counter, eat like you live here.' },
    ...boards,
  ];
}
