import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSpot, getTips, getReviews, getOwnerResponses } from '@/lib/spots';
import { getEventsForSpot } from '@/lib/events';
import { getActiveSpecials, scheduleLabel } from '@/lib/specials';
import MenuViewer from '@/components/MenuViewer';
import SpotPhotos from '@/components/SpotPhotos';
import VerdictStamp from '@/components/VerdictStamp';
import Tag from '@/components/Tag';
import SignalBar from '@/components/SignalBar';
import SiteFooter from '@/components/SiteFooter';
import PhotoContribute from '@/components/PhotoContribute';
import TipContribute from '@/components/TipContribute';
import ReviewContribute from '@/components/ReviewContribute';
import ClaimContribute from '@/components/ClaimContribute';
import Subscribe from '@/components/Subscribe';
import { snippetFor, faqLd, readerRatingLd } from '@/lib/seo';
import type { Metadata } from 'next';

// ISR: render once, cache 60s, generate pages on demand. No per-user auth() in the render —
// the logged-in/owner UI is handled by client islands (Photo/Tip/Review/Claim Contribute).
export const revalidate = 60;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const spot = await getSpot(slug);
  if (!spot) return { title: 'Not found' };
  const { title, description } = snippetFor(spot);
  const img = spot.localPhotos[0]
    ? `/uploads/${spot.localPhotos[0].filename}`
    : spot.photo ? `/img?n=${encodeURIComponent(spot.photo)}&w=1200` : undefined;
  return {
    // `absolute` bypasses the root template ("%s · The Leander Local Guide"): the snippet already
    // carries the brand, and the template would push the title past what Google renders.
    title: { absolute: title },
    description,
    alternates: { canonical: `/r/${slug}` },
    // Social cards keep the editorial voice; only the search snippet is optimised for the SERP.
    openGraph: { title: `${spot.name} · The Leander Local Guide`, description: spot.hook || description, type: 'article', images: img ? [img] : undefined },
  };
}

export default async function SpotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const spot = await getSpot(slug);
  if (!spot) notFound();

  const siteKey = process.env.TURNSTILE_SITE_KEY || '';
  const [tips, reviews, ownerResponses, events, specials] = await Promise.all([
    getTips(slug), getReviews(slug), getOwnerResponses(slug), getEventsForSpot(slug), getActiveSpecials(slug),
  ]);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const mapEmbed = `https://www.google.com/maps?q=${encodeURIComponent(`${spot.name} ${spot.addressLine}`)}&output=embed`;
  const reviewParas = (spot.review || '').split(/\n\n+/).filter(Boolean);

  const addrParts = spot.addressLine.split(',').map((s) => s.trim());
  const zip = (spot.addressLine.match(/TX (\d{5})/) || [])[1];
  const ogImg = spot.localPhotos[0]
    ? `https://leanderlocalguide.com/uploads/${spot.localPhotos[0].filename}`
    : spot.photo ? `https://leanderlocalguide.com/img?n=${encodeURIComponent(spot.photo)}&w=1200` : undefined;
  const updated = spot.updatedAt ? new Date(spot.updatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null;
  // Stars come from readers, never from our verdict. readerRatingLd() is the only function allowed
  // to emit a rating, and it takes reader reviews and nothing else, so a verdict physically cannot
  // get in. See the long note on it in lib/seo.ts for the Google rule this enforces.
  const ratingLd = readerRatingLd(reviews);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `https://leanderlocalguide.com/r/${slug}#restaurant`,
    name: spot.name,
    url: spot.website || undefined,
    mainEntityOfPage: `https://leanderlocalguide.com/r/${slug}`,
    servesCuisine: spot.cuisines.length ? spot.cuisines : undefined,
    priceRange: spot.priceTier ? '$'.repeat(spot.priceTier) : undefined,
    telephone: spot.phone || undefined,
    image: ogImg ? [ogImg] : undefined,
    // `menu` is the property Google documents on LocalBusiness (a fully-qualified menu URL).
    // Prefer our own transcribed menu page when we have one, since that is a real, crawlable menu;
    // otherwise point at the restaurant's own. hasMenu stays for schema completeness.
    menu: spot.menuData ? `https://leanderlocalguide.com/r/${slug}/menu` : (spot.menuUrl || undefined),
    hasMenu: spot.menuData ? `https://leanderlocalguide.com/r/${slug}/menu` : undefined,
    address: { '@type': 'PostalAddress', streetAddress: addrParts[0], addressLocality: 'Leander', addressRegion: 'TX', postalCode: zip, addressCountry: 'US' },
    // Reader-submitted ratings only, and only once three exist. See the note above ratingLd.
    ...ratingLd,
  };
  const faqLdJson = faqLd(spot, `https://leanderlocalguide.com/r/${slug}`);
  const crumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://leanderlocalguide.com/' },
      { '@type': 'ListItem', position: 2, name: 'Food', item: 'https://leanderlocalguide.com/food' },
      { '@type': 'ListItem', position: 3, name: spot.name, item: `https://leanderlocalguide.com/r/${slug}` },
    ],
  };
  const SITE = 'https://leanderlocalguide.com';
  const evImage = spot.headerPhoto ? `${SITE}${spot.headerPhoto.url}?w=1200`
    : spot.photo ? `${SITE}/img?n=${encodeURIComponent(spot.photo)}&w=1200`
      : spot.localPhotos[0] ? `${SITE}${spot.localPhotos[0].url}?w=1200` : null;
  // Only emit Event structured data for events with a real next date (Google requires startDate).
  const eventLd = events.filter((e) => e.startDate).map((e) => ({
    '@context': 'https://schema.org', '@type': 'Event', name: e.title,
    description: e.description || `${e.label} at ${spot.name}, ${addrParts[0]} in Leander, TX.`,
    startDate: e.startDate,
    ...(e.endDate ? { endDate: e.endDate } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(evImage ? { image: [evImage] } : {}),
    location: { '@type': 'Place', name: spot.name, address: { '@type': 'PostalAddress', streetAddress: addrParts[0], addressLocality: 'Leander', addressRegion: 'TX', postalCode: zip, addressCountry: 'US' } },
    performer: { '@type': 'PerformingGroup', name: spot.name },
    organizer: { '@type': 'Organization', name: spot.name, url: `${SITE}/r/${slug}` },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: e.url || `${SITE}/r/${slug}`, validFrom: e.startDate },
    url: e.url || `${SITE}/r/${slug}`,
  }));

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }} />
      {faqLdJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLdJson) }} />}
      {eventLd.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }} />}
      {/* Hero */}
      <header className="border-b-2 border-ink">
        <div className="max-w-5xl mx-auto px-5 pt-8 pb-6">
          <Link href="/" className="inline-flex items-center gap-1 font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft hover:text-chile transition-colors mb-5">
            ← Back to the guide
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="font-stamp uppercase tracking-[0.18em] text-chile text-sm mb-2">
                {/* 'unknown' used to fall through to "Local" here, so an unclassified spot was
                    being called locally owned on its own page. Say nothing rather than guess. */}
                {[spot.category,
                  spot.chainStatus === 'chain' ? 'Chain'
                    : spot.chainStatus === 'regional' ? 'Texas Chain'
                      : spot.chainStatus === 'local' ? 'Local Owned' : null,
                  ...spot.cuisines.slice(0, 2)].filter(Boolean).join(' · ')}
              </p>
              <h1 className="font-display font-black text-ink leading-[0.92] tracking-[-0.02em]" style={{ fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }}>
                {spot.name}
              </h1>
              <div className="mt-3 flex items-center gap-3 flex-wrap font-ui text-sm text-ink-soft">
                {!spot.comingSoon && spot.openNow === true && <span className="font-stamp uppercase tracking-[0.08em] text-sm text-ink bg-amber px-2 py-0.5 rounded-sm">Open Now</span>}
                {!spot.comingSoon && spot.openNow === false && <span className="font-stamp uppercase tracking-[0.08em] text-sm text-ink-soft border border-rule px-2 py-0.5 rounded-sm">Closed</span>}
                {spot.ratingGoogle && <span>Google: {spot.ratingGoogle}★ ({spot.ratingCount ?? 0})</span>}
                {spot.priceTier ? <span>{'$'.repeat(spot.priceTier)}</span> : null}
              </div>
              {spot.comingSoon && (
                <p className="mt-3 font-hand text-xl text-chile">
                  {spot.openingNote || 'Not open yet, but the sign is up and Leander is watching.'}
                </p>
              )}
            </div>
            {spot.comingSoon ? (
              <VerdictStamp label="COMING SOON" className="text-lg shrink-0" />
            ) : spot.visited ? (
              <VerdictStamp rating={spot.ratingGoogle} label={spot.verdict} className="text-lg shrink-0" />
            ) : (
              // The verdict shows here too, because it already shows on every card across the site
              // and now in the search snippet. What stays honest is the line under it: this call
              // comes from what reviewers say, not from a visit of Anthony's.
              <div className="shrink-0 text-right">
                <VerdictStamp rating={spot.ratingGoogle} label={spot.verdict} className="text-lg" />
                <div className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mt-1.5">
                  Going by the reviews{spot.ratingGoogle ? ` · ${spot.ratingGoogle}★` : ''}
                </div>
                <div className="font-stamp uppercase tracking-[0.08em] text-xs text-chile">Not yet visited</div>
              </div>
            )}
          </div>
          {spot.summary && <p className="mt-4 font-ui text-ink-soft max-w-2xl italic">{spot.summary}</p>}
          {(spot.badges.length > 0 || spot.amenities.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {[...new Set([...spot.badges, ...spot.amenities])].map((b) => <Tag key={b} label={b} />)}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-rule">
            <p className="font-stamp uppercase tracking-[0.12em] text-ink-soft text-xs mb-2">Your call, Leander</p>
            <SignalBar placeId={spot.id} initial={{ worthIt: spot.worthIt, itsFine: spot.itsFine, skipIt: spot.skipIt, beenHere: spot.beenHere, wantToGo: spot.wantToGo }} />
          </div>
        </div>
      </header>

      {specials.length > 0 && (
        <div className="border-b-2 border-ink bg-paper-raised">
          <div className="max-w-2xl mx-auto px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/locals-only.webp" alt="" width={24} height={24} className="w-6 h-6" />
              <h2 className="font-stamp uppercase tracking-[0.14em] text-chile text-sm">Local Passport</h2>
            </div>
            <ul className="space-y-2">
              {specials.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 border-l-2 border-chile pl-3">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-ink leading-tight">{s.title}</p>
                    {s.details && <p className="font-ui text-xs text-ink-soft">{s.details}</p>}
                    <p className="font-stamp uppercase tracking-[0.06em] text-sm text-ink-soft">{scheduleLabel(s)}</p>
                  </div>
                  <Link href={`/ticket/${s.id}?src=listing`} className="shrink-0 font-stamp uppercase tracking-[0.08em] text-xs bg-chile text-paper px-3 py-2 rounded-sm hover:bg-oxblood">Get the stamp →</Link>
                </li>
              ))}
            </ul>
            <p className="font-ui text-sm text-ink-soft mt-2">A standing perk from the owner to people who found them here. Pull the stamp, show it at the counter. <Link href="/passport" className="text-chile">See the whole Passport →</Link></p>
          </div>
        </div>
      )}

      {(() => {
        // Default header = the Google image; a local photo only takes over if explicitly set as header.
        const heroLocal = spot.headerPhoto || (!spot.photo ? spot.localPhotos[0] : null);
        const g = spot.photo ? `/img?n=${encodeURIComponent(spot.photo)}` : null;
        const hero = heroLocal
          ? { key: 'hero', display: `${heroLocal.url}?w=1200`, big: `${heroLocal.url}?w=1600`, full: heroLocal.url, caption: heroLocal.caption }
          : g ? { key: 'hero', display: `${g}&w=1200`, big: `${g}&w=1600`, full: `${g}&w=1600`, caption: null } : null;
        const gallery = spot.localPhotos.filter((p) => p.id !== heroLocal?.id).map((p) => ({
          key: String(p.id), display: `${p.url}?w=600`, big: `${p.url}?w=1600`, full: p.url, caption: p.caption,
        }));
        return <SpotPhotos hero={hero} gallery={gallery} name={spot.name} />;
      })()}

      {(spot.menus.length > 0 || spot.menuData) && (
        <section className="border-b border-rule bg-paper-raised">
          <div className="max-w-5xl mx-auto px-5 py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <h2 className="font-stamp uppercase tracking-[0.15em] text-chile text-sm">📋 The Menu</h2>
              {spot.menuData && (
                <Link href={`/r/${slug}/menu`} className="font-stamp uppercase tracking-[0.08em] text-xs bg-chile text-paper px-3 py-1.5 rounded-sm hover:bg-oxblood">
                  Read the full menu with prices →
                </Link>
              )}
            </div>
            {spot.menuData && (
              <p className="font-ui text-xs text-ink-soft mb-2">
                Every dish typed up and searchable: <Link href={`/r/${slug}/menu`} className="text-chile underline underline-offset-2">{spot.menuData.sections.reduce((a, s) => a + s.items.length, 0)} dishes across {spot.menuData.sections.length} sections</Link>.
              </p>
            )}
            {spot.menus.length > 0 && (
              <>
                <p className="font-ui text-xs text-ink-soft mb-3">Tap to view full size and zoom in.</p>
                <MenuViewer menus={spot.menus} />
              </>
            )}
          </div>
        </section>
      )}

      <section className="border-b border-rule bg-paper-raised">
        <div className="max-w-5xl mx-auto px-5 py-4">
          <h3 className="font-stamp uppercase tracking-[0.12em] text-ink-soft text-xs mb-2">Got a shot of this place?</h3>
          <PhotoContribute slug={slug} siteKey={siteKey} />
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-5 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Review spine */}
        <article className="lg:col-span-2">
          <h2 className="font-stamp uppercase tracking-[0.15em] text-ink-soft text-sm mb-1">{spot.visited ? "Anthony's take" : `The word on ${spot.name}`}</h2>
          {spot.visited ? (
            <p className="font-ui text-xs text-ink-soft mb-4">
              By <Link href="/about" className="text-chile underline underline-offset-2">Anthony Martinez</Link>, The Leander Local{spot.visitedDate ? ` · Visited ${spot.visitedDate}` : ''}{updated ? ` · Updated ${updated}` : ''}
            </p>
          ) : (
            <div className="mb-5 border-l-2 border-chile/50 pl-3">
              {spot.summaryNote && <p className="font-stamp uppercase tracking-[0.1em] text-sm text-chile mb-1">Here&apos;s the word going around</p>}
              <p className="font-ui text-sm text-ink-soft italic leading-relaxed">
                {spot.summaryNote || "Heads up: I haven't made it here myself yet, so I'm pulling together what Leander reviewers say. Summary coming soon."}
              </p>
              <p className="font-ui text-xs text-ink-soft mt-1.5">
                <Link href="/about" className="text-chile underline underline-offset-2">Anthony</Link>, The Leander Local{updated ? ` · Last checked ${updated}` : ''}
              </p>
            </div>
          )}
          {(spot.visited || spot.summaryNote) ? (
            reviewParas.length > 0 ? (
              <div className="font-display text-[1.1875rem] leading-[1.7] text-ink space-y-4">
                {reviewParas.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            ) : (
              <p className="font-hand text-2xl text-oxblood">Anthony hasn&apos;t filed this one yet.</p>
            )
          ) : (
            <p className="font-hand text-2xl text-oxblood leading-snug">Still pulling together what the reviews say about this one. Check back soon.</p>
          )}

          {!spot.visited && spot.cantWait && (
            <p className="font-hand text-2xl text-oxblood leading-snug mt-6">{spot.cantWait}</p>
          )}

          {(spot.visited || spot.summaryNote) && spot.whatToOrder && (
            <div className="mt-8 border-l-4 border-chile pl-4 py-1">
              <h3 className="font-stamp uppercase tracking-[0.15em] text-chile text-sm mb-1">The Order</h3>
              <p className="font-hand text-2xl text-ink leading-snug">{spot.whatToOrder}</p>
            </div>
          )}

          {(spot.visited || spot.summaryNote) && spot.gotcha && (
            <div className="mt-6 bg-paper-sunk border border-rule p-4">
              <h3 className="font-stamp uppercase tracking-[0.15em] text-oxblood text-sm mb-1">⚠ Gotcha</h3>
              <p className="font-ui text-sm text-ink">{spot.gotcha}</p>
            </div>
          )}

          {events.length > 0 && (
            <div className="mt-8 border-t border-rule pt-6">
              <h3 className="font-stamp uppercase tracking-[0.15em] text-chile text-sm mb-3">What&apos;s On</h3>
              <ul className="space-y-3">
                {events.map((e) => (
                  <li key={e.id} className="flex items-baseline gap-3">
                    <span className="text-lg shrink-0">{e.emoji}</span>
                    <div>
                      <span className="font-display font-semibold text-ink">{e.title}</span>
                      <span className="font-ui text-sm text-ink-soft"> · {e.when}</span>
                      {e.description && <p className="font-ui text-sm text-ink-soft">{e.description}</p>}
                      {e.confirmedNote && <p className="font-ui text-sm text-ink-soft/80 mt-0.5">{e.fresh ? '✓ ' : '⚠ '}{e.confirmedNote}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/whats-on" className="mt-3 inline-flex font-stamp uppercase tracking-[0.08em] text-xs text-chile hover:text-oxblood">All Leander events →</Link>
            </div>
          )}

          {/* Email capture, post-verdict */}
          <div className="mt-8">
            <Subscribe source={`spot:${slug}`} siteKey={siteKey}
              headline="That's the word on this one."
              sub="I'm working through every spot in Leander, and posting my own take as I go. Get the next one before everyone else, one email a week."
              cta="Send me the good stuff" />
          </div>

          {/* Locals say */}
          <div className="mt-8 border-t border-rule pt-6">
            <h3 className="font-stamp uppercase tracking-[0.15em] text-ink-soft text-sm mb-3">Locals say</h3>
            {tips.length > 0 && (
              <ul className="space-y-3 mb-5">
                {tips.map((t, i) => (
                  <li key={i} className="font-ui text-sm text-ink border-l-2 border-rule pl-3">{t.body}</li>
                ))}
              </ul>
            )}
            <TipContribute slug={slug} siteKey={siteKey} />
          </div>

          {/* From the owner (clearly separate from Anthony's independent take above) */}
          {(spot.ownerBlurb || ownerResponses.length > 0) && (
            <div className="mt-8 border-t border-rule pt-6">
              <h3 className="font-stamp uppercase tracking-[0.15em] text-chile text-sm mb-3">From the owner</h3>
              {spot.ownerBlurb && <p className="font-ui text-sm text-ink border-l-2 border-chile pl-3 mb-2">{spot.ownerBlurb}</p>}
              {ownerResponses.map((o, i) => (
                <p key={i} className="font-ui text-sm text-ink border-l-2 border-chile pl-3 mb-2">{o.body}</p>
              ))}
            </div>
          )}

          {/* Local reviews */}
          <div className="mt-8 border-t border-rule pt-6">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-stamp uppercase tracking-[0.15em] text-ink-soft text-sm">Local reviews</h3>
              {reviews.avg != null && (
                <span className="font-ui text-sm text-ink">{reviews.avg}★ <span className="text-ink-soft text-xs">from locals ({reviews.count})</span></span>
              )}
            </div>
            {reviews.list.length > 0 && (
              <ul className="space-y-4 mb-5">
                {reviews.list.map((rv, i) => (
                  <li key={i} className="border-l-2 border-rule pl-3">
                    <span className="text-amber text-sm">{'★'.repeat(rv.stars)}<span className="text-rule">{'★'.repeat(5 - rv.stars)}</span></span>
                    {rv.body && <p className="font-ui text-sm text-ink mt-1">{rv.body}</p>}
                    <p className="font-ui text-sm text-ink-soft mt-0.5">by {rv.who}</p>
                  </li>
                ))}
              </ul>
            )}
            <ReviewContribute slug={slug} siteKey={siteKey} />
          </div>

          {/* Map */}
          <div className="mt-8 border-t border-rule pt-6">
            <h3 className="font-stamp uppercase tracking-[0.15em] text-ink-soft text-sm mb-3">Where</h3>
            <div className="aspect-[16/9] border border-rule overflow-hidden bg-paper-sunk">
              <iframe title={`Map of ${spot.name}`} src={mapEmbed} loading="lazy" className="w-full h-full" style={{ border: 0, filter: 'grayscale(0.2) contrast(1.05)' }} />
            </div>
            <Link href={`/map?spot=${slug}`} className="mt-3 mr-4 inline-flex font-stamp uppercase tracking-[0.1em] text-sm text-chile hover:text-oxblood">
              See it on the Leander map →
            </Link>
            {spot.mapsUrl && (
              <a href={spot.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex font-stamp uppercase tracking-[0.1em] text-sm text-chile hover:text-oxblood">
                Open in Google Maps →
              </a>
            )}
          </div>
        </article>

        {/* Spec sheet */}
        <aside className="lg:col-span-1">
          <div className="bg-paper-sunk border border-rule p-5">
            <h2 className="font-stamp uppercase tracking-[0.15em] text-ink text-sm mb-4 border-b border-rule pb-2">The Facts</h2>
            <dl className="font-ui text-sm space-y-3 text-ink">
              {spot.priceTier && <div className="flex justify-between"><dt className="text-ink-soft">Price</dt><dd>{'$'.repeat(spot.priceTier)}</dd></div>}
              <div><dt className="text-ink-soft mb-1">Address</dt><dd>{spot.addressLine}</dd></div>
              {spot.phone && <div className="flex justify-between"><dt className="text-ink-soft">Phone</dt><dd><a href={`tel:${spot.phone}`} className="text-chile">{spot.phone}</a></dd></div>}
              {spot.weekHours && (
                <div><dt className="text-ink-soft mb-1">Hours</dt><dd>
                  <ul className="space-y-0.5">
                    {spot.weekHours.map((line, i) => (
                      <li key={i} className={i === todayIdx ? 'text-chile font-semibold' : ''}>
                        <span className="inline-block w-9 text-ink-soft">{dayNames[i]}</span>{line.replace(/^[A-Za-z]+:\s*/, '')}
                      </li>
                    ))}
                  </ul>
                </dd></div>
              )}
              {spot.happyHour && <div><dt className="text-ink-soft mb-1">Happy Hour</dt><dd className="text-ink">{spot.happyHour}</dd></div>}
              {spot.website && <div><dt className="text-ink-soft">Website</dt><dd className="truncate"><a href={spot.website} target="_blank" rel="noopener noreferrer" className="text-chile underline underline-offset-2">{spot.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></dd></div>}
              {spot.menuUrl && <div><dt className="text-ink-soft">Menu</dt><dd><a href={spot.menuUrl} target="_blank" rel="noopener noreferrer" className="text-chile underline underline-offset-2">View menu</a></dd></div>}
              {spot.orderUrl && <div><dt className="text-ink-soft">Order</dt><dd><a href={spot.orderUrl} target="_blank" rel="noopener noreferrer" className="text-chile underline underline-offset-2">Order online</a></dd></div>}
            </dl>
          </div>

          <div className="mt-6 border-2 border-dashed border-oxblood bg-paper-raised p-5 -rotate-1">
            <p className="font-stamp uppercase tracking-[0.12em] text-chile text-xs mb-1">Why trust this</p>
            <p className="font-display font-bold text-xl text-ink leading-tight">No sponsors. No pay-to-play.</p>
            <p className="font-ui text-xs text-ink-soft mt-2">Every verdict here is an honest, local read, never bought and never traded for a free meal. That&apos;s the whole point.</p>
            <Link href="/about" className="mt-3 inline-flex font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-4 py-2 hover:bg-oxblood transition-colors">
              How this works
            </Link>
          </div>

          <ClaimContribute slug={slug} siteKey={siteKey} />
        </aside>
      </div>

      <SiteFooter />
    </main>
  );
}
