import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSpot, getTips, getReviews, getOwnerResponses } from '@/lib/spots';
import VerdictStamp from '@/components/VerdictStamp';
import Tag from '@/components/Tag';
import SignalBar from '@/components/SignalBar';
import SiteFooter from '@/components/SiteFooter';
import PhotoContribute from '@/components/PhotoContribute';
import TipContribute from '@/components/TipContribute';
import ReviewContribute from '@/components/ReviewContribute';
import ClaimContribute from '@/components/ClaimContribute';
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
  const desc = (spot.hook || spot.summary || `${spot.name}, a ${spot.category.toLowerCase()} in Leander, Texas. Anthony's take, hours, menu, and map.`).slice(0, 160);
  const img = spot.localPhotos[0]
    ? `/uploads/${spot.localPhotos[0].filename}`
    : spot.photo ? `/img?n=${encodeURIComponent(spot.photo)}&w=1200` : undefined;
  return {
    title: `${spot.name}, Leander TX`,
    description: desc,
    alternates: { canonical: `/r/${slug}` },
    openGraph: { title: `${spot.name} · The Leander Local Guide`, description: desc, type: 'article', images: img ? [img] : undefined },
  };
}

export default async function SpotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const spot = await getSpot(slug);
  if (!spot) notFound();

  const siteKey = process.env.TURNSTILE_SITE_KEY || '';
  const [tips, reviews, ownerResponses] = await Promise.all([
    getTips(slug), getReviews(slug), getOwnerResponses(slug),
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
  const updatedISO = spot.updatedAt ? new Date(spot.updatedAt).toISOString().slice(0, 10) : undefined;
  const VERDICT_RATING: Record<string, number> = {
    'WORTH THE GRAVEL': 5, 'WORTH IT': 4.5, 'SOLID': 4, "IT'S FINE": 3.5, 'SKIP IT': 2,
  };
  const ratingValue = spot.verdict ? (VERDICT_RATING[spot.verdict.toUpperCase()] ?? 4) : 4;
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
    address: { '@type': 'PostalAddress', streetAddress: addrParts[0], addressLocality: 'Leander', addressRegion: 'TX', postalCode: zip, addressCountry: 'US' },
    review: spot.review
      ? {
          '@type': 'Review',
          reviewRating: { '@type': 'Rating', ratingValue, bestRating: 5, worstRating: 1 },
          author: { '@type': 'Person', '@id': 'https://leanderlocalguide.com/about#anthony-martinez', name: 'Anthony Martinez', url: 'https://leanderlocalguide.com/about' },
          publisher: { '@id': 'https://leanderlocalguide.com/#org' },
          name: spot.hook || undefined,
          reviewBody: spot.review,
          datePublished: updatedISO,
          dateModified: updatedISO,
        }
      : undefined,
  };
  const crumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://leanderlocalguide.com/' },
      { '@type': 'ListItem', position: 2, name: 'Food', item: 'https://leanderlocalguide.com/food' },
      { '@type': 'ListItem', position: 3, name: spot.name, item: `https://leanderlocalguide.com/r/${slug}` },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }} />
      {/* Hero */}
      <header className="border-b-2 border-ink">
        <div className="max-w-5xl mx-auto px-5 pt-8 pb-6">
          <Link href="/" className="inline-flex items-center gap-1 font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft hover:text-chile transition-colors mb-5">
            ← Back to the guide
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="font-stamp uppercase tracking-[0.18em] text-chile text-sm mb-2">
                {[spot.category, spot.chainStatus === 'chain' ? 'Chain' : 'Local', ...spot.cuisines.slice(0, 2)].join(' · ')}
              </p>
              <h1 className="font-display font-black text-ink leading-[0.92] tracking-[-0.02em]" style={{ fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }}>
                {spot.name}
              </h1>
              <div className="mt-3 flex items-center gap-3 flex-wrap font-ui text-sm text-ink-soft">
                {spot.openNow === true && <span className="font-stamp uppercase tracking-[0.08em] text-[12px] text-ink bg-amber px-2 py-0.5 rounded-sm">Open Now</span>}
                {spot.openNow === false && <span className="font-stamp uppercase tracking-[0.08em] text-[12px] text-ink-soft border border-rule px-2 py-0.5 rounded-sm">Closed</span>}
                {spot.ratingGoogle && <span>Google: {spot.ratingGoogle}★ ({spot.ratingCount ?? 0})</span>}
                {spot.priceTier ? <span>{'$'.repeat(spot.priceTier)}</span> : null}
              </div>
            </div>
            <VerdictStamp rating={spot.ratingGoogle} label={spot.verdict} className="text-lg shrink-0" />
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

      {(spot.localPhotos[0] || spot.photo) && (
        <div className="border-b border-rule bg-paper-sunk">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={spot.localPhotos[0] ? spot.localPhotos[0].url : `/img?n=${encodeURIComponent(spot.photo!)}&w=1200`}
            alt={spot.name}
            width={1200}
            height={400}
            fetchPriority="high"
            loading="eager"
            className="block w-full max-w-5xl mx-auto h-[260px] sm:h-[360px] object-cover"
          />
        </div>
      )}

      {spot.localPhotos.length > 1 && (
        <section className="border-b border-rule">
          <div className="max-w-5xl mx-auto px-5 py-5 flex gap-3 overflow-x-auto no-scrollbar">
            {spot.localPhotos.slice(1).map((p) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={p.id} src={p.url} alt={spot.name} loading="lazy" className="h-44 w-auto object-cover border border-rule shrink-0" />
            ))}
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
          <h2 className="font-stamp uppercase tracking-[0.15em] text-ink-soft text-sm mb-1">Anthony&apos;s take</h2>
          <p className="font-ui text-xs text-ink-soft mb-4">
            By <Link href="/about" className="text-chile underline underline-offset-2">Anthony Martinez</Link>, The Leander Local{updated ? ` · Updated ${updated}` : ''}
          </p>
          {reviewParas.length > 0 ? (
            <div className="font-display text-[1.1875rem] leading-[1.7] text-ink space-y-4">
              {reviewParas.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          ) : (
            <p className="font-hand text-2xl text-oxblood">Anthony hasn&apos;t filed this one yet.</p>
          )}

          {spot.whatToOrder && (
            <div className="mt-8 border-l-4 border-chile pl-4 py-1">
              <h3 className="font-stamp uppercase tracking-[0.15em] text-chile text-sm mb-1">The Order</h3>
              <p className="font-hand text-2xl text-ink leading-snug">{spot.whatToOrder}</p>
            </div>
          )}

          {spot.gotcha && (
            <div className="mt-6 bg-paper-sunk border border-rule p-4">
              <h3 className="font-stamp uppercase tracking-[0.15em] text-oxblood text-sm mb-1">⚠ Gotcha</h3>
              <p className="font-ui text-sm text-ink">{spot.gotcha}</p>
            </div>
          )}

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

          {/* From the owner */}
          {ownerResponses.length > 0 && (
            <div className="mt-8 border-t border-rule pt-6">
              <h3 className="font-stamp uppercase tracking-[0.15em] text-chile text-sm mb-3">From the owner</h3>
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
                    <p className="font-ui text-[11px] text-ink-soft mt-0.5">by {rv.who}</p>
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
              {spot.happyHour && <div><dt className="text-ink-soft mb-1">🍸 Happy Hour</dt><dd className="text-ink">{spot.happyHour}</dd></div>}
              {spot.website && <div><dt className="text-ink-soft">Website</dt><dd className="truncate"><a href={spot.website} target="_blank" rel="noopener noreferrer" className="text-chile underline underline-offset-2">{spot.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></dd></div>}
              {spot.menuUrl && <div><dt className="text-ink-soft">Menu</dt><dd><a href={spot.menuUrl} target="_blank" rel="noopener noreferrer" className="text-chile underline underline-offset-2">View menu</a></dd></div>}
              {spot.orderUrl && <div><dt className="text-ink-soft">Order</dt><dd><a href={spot.orderUrl} target="_blank" rel="noopener noreferrer" className="text-chile underline underline-offset-2">Order online</a></dd></div>}
            </dl>
          </div>

          <div className="mt-6 border-2 border-dashed border-oxblood bg-paper-raised p-5 -rotate-1">
            <p className="font-stamp uppercase tracking-[0.12em] text-chile text-xs mb-1">Admit one</p>
            <p className="font-display font-bold text-xl text-ink leading-tight">Eat here with Anthony</p>
            <p className="font-ui text-xs text-ink-soft mt-2">He runs personalized Leander food crawls. This spot might be on one.</p>
            <Link href="/about" className="mt-3 inline-flex font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-4 py-2 hover:bg-oxblood transition-colors">
              🍴 Book a tour
            </Link>
          </div>

          <ClaimContribute slug={slug} siteKey={siteKey} />
        </aside>
      </div>

      <SiteFooter />
    </main>
  );
}
