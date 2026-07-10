import Link from 'next/link';
import { getAllSpots, countSpots, getFreshInk } from '@/lib/spots';
import FilterableGrid from '@/components/FilterableGrid';
import FreshInk from '@/components/FreshInk';
import FeedMe from '@/components/FeedMe';
import VerdictStamp from '@/components/VerdictStamp';
import SiteFooter from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';

export const metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    title: 'The Leander Local Guide · Leander, TX food scene',
    description: 'An honest local food guide to Leander, Texas: a curated summary of what diners say about every restaurant, bar, cafe and food truck. By a local, for locals.',
    url: 'https://leanderlocalguide.com/',
    siteName: 'The Leander Local Guide',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Leander Local Guide',
    description: 'An honest local food guide to every spot in Leander, TX, summarizing what real diners say.',
  },
};

export default async function Home() {
  const [spots, counts, ink] = await Promise.all([getAllSpots(), countSpots(), getFreshInk()]);
  const dateline = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  // Tonight's Pick rotates daily (America/Chicago): Penny Royal today, Mockingbird tomorrow,
  // then through the live Hidden Gems set. Anchored so 2026-07-10 = Penny Royal.
  const cstParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const cstPart = (t: string) => cstParts.find((p) => p.type === t)?.value || '';
  const dayNum = Math.floor(Date.parse(`${cstPart('year')}-${cstPart('month')}-${cstPart('day')}T00:00:00Z`) / 86400000);
  const anchor = Math.floor(Date.UTC(2026, 6, 10) / 86400000); // 2026-07-10 -> index 0 (Penny Royal)
  const LEAD = ['penny-royal-bakery', 'mockingbird-bakes'];
  const gemSlugs = spots.filter((s) => !s.comingSoon && s.badges.includes('Hidden Gem')).map((s) => s.slug);
  const rotation = [...LEAD, ...gemSlugs.filter((sl) => !LEAD.includes(sl))].filter((sl) => spots.some((s) => s.slug === sl && !s.comingSoon));
  // never send anyone to a spot that isn't open yet
  const pick = (rotation.length ? spots.find((s) => s.slug === rotation[(((dayNum - anchor) % rotation.length) + rotation.length) % rotation.length]) : undefined) || spots.find((s) => !s.comingSoon);
  const feed = spots.filter((s) => !s.comingSoon).map((s) => ({
    slug: s.slug, name: s.name, category: s.category, hook: s.hook, rating: s.ratingGoogle, priceTier: s.priceTier,
  }));
  // trim heavy prose for the client grid payload (explicit pick = small + lint-clean)
  const cards = spots.map((s) => ({
    id: s.id, slug: s.slug, name: s.name, category: s.category, cuisines: s.cuisines,
    ratingGoogle: s.ratingGoogle, priceTier: s.priceTier, addressLine: s.addressLine,
    hoursToday: s.hoursToday, openNow: s.openNow, periods: s.periods, open24: s.open24, openLate: s.openLate,
    photo: s.photo, photoCredit: s.photoCredit,
    verdict: s.verdict, hook: s.hook, badges: s.badges, amenities: s.amenities,
    chainStatus: s.chainStatus, beenHere: s.beenHere, worthIt: s.worthIt, itsFine: s.itsFine,
    skipIt: s.skipIt, wantToGo: s.wantToGo, visited: s.visited, happyHour: s.happyHour, localPhotos: s.localPhotos, headerPhoto: s.headerPhoto,
    comingSoon: s.comingSoon,
  }));

  return (
    <main>
      {/* Masthead */}
      <header className="border-b-2 border-ink">
        <div className="max-w-6xl mx-auto px-5 pt-9 pb-5">
          <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-2">
            Leander, Texas · Local-First · No Nonsense
          </p>
          <h1 className="font-display font-black text-ink leading-[0.9] tracking-[-0.03em]" style={{ fontSize: 'clamp(2.75rem, 8vw, 7rem)' }}>
            The Leander
            <br />
            Local Guide
          </h1>
          <p className="mt-4 font-stamp uppercase tracking-[0.1em] text-ink-soft text-sm">
            {counts.total} Spots · {counts.local} Local · {counts.chain} Chains (sorted to the back) · Eat where Leander actually eats
          </p>
        </div>
      </header>

      <FreshInk items={ink} dateline={dateline} />

      {/* Tonight's Pick + FEED ME (on ink) */}
      <section className="bg-ink text-paper">
        <div className="max-w-6xl mx-auto px-5 py-12 md:py-16">
          <p className="font-stamp uppercase tracking-[0.22em] text-amber text-sm mb-4">Tonight&apos;s Pick</p>
          {pick && (
            <Link href={`/r/${pick.slug}`} className="group flex flex-col md:flex-row md:items-end md:justify-between gap-7 rounded-sm -mx-2 px-2 py-1 transition-colors hover:bg-paper/5">
              <div className="max-w-2xl">
                <h2 className="font-display font-black leading-[0.95] tracking-tight transition-colors group-hover:text-amber" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
                  {pick.name}
                  <span aria-hidden="true" className="inline-block ml-3 align-middle text-amber transition-transform group-hover:translate-x-1" style={{ fontSize: '0.5em' }}>→</span>
                </h2>
                {pick.hook ? (
                  <p className="mt-4 font-hand text-2xl text-amber">“{pick.hook}”</p>
                ) : (
                  <p className="mt-4 font-hand text-2xl text-amber/80">{pick.cuisines[0] || pick.category} · {pick.addressLine}</p>
                )}
                <p className="mt-5 font-ui text-sm text-paper/70">
                  {[pick.category, pick.ratingGoogle ? `${pick.ratingGoogle}★ Google` : null, pick.hoursToday].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex md:flex-col items-center md:items-end gap-4 shrink-0">
                {pick.ratingGoogle && <span className="font-hand text-6xl text-amber leading-none">{pick.ratingGoogle}</span>}
                <VerdictStamp rating={pick.ratingGoogle} label={pick.verdict} light className="text-lg" />
              </div>
            </Link>
          )}
          <div className="mt-10">
            <FeedMe spots={feed} />
          </div>
        </div>
      </section>

      {/* The directory */}
      <section className="max-w-6xl mx-auto px-5 py-12">
        <div className="flex items-baseline justify-between mb-8 border-b border-rule pb-2">
          <h2 className="font-display font-bold text-3xl text-ink">Every Spot in Leander</h2>
          <span className="font-stamp uppercase tracking-[0.1em] text-ink-soft text-sm">{counts.total} and counting</span>
        </div>
        <FilterableGrid spots={cards} />
      </section>

      <SiteFooter />
    </main>
  );
}
