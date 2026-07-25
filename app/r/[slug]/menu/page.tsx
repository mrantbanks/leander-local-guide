import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSpot } from '@/lib/spots';
import MenuViewer from '@/components/MenuViewer';
import VerdictStamp from '@/components/VerdictStamp';
import SiteFooter from '@/components/SiteFooter';
import { menuSnippet, ogMenu, restaurantLdMenu, breadcrumbLdMenu, ldJson } from '@/lib/seo';
import type { Metadata } from 'next';

// The menu page: every dish and price as crawlable text + Menu structured data.
// "<restaurant> menu" is one of the most-searched local queries; a photo of a menu is
// invisible to that search. This page is the answer, with the photo as the receipt.
export const revalidate = 60;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

const showPrice = (p?: string) => p ? (/^\d/.test(p.trim()) ? `$${p.trim()}` : p.trim()) : null;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const spot = await getSpot(slug);
  if (!spot || !spot.menuData) return { title: 'Not found' };
  const m = spot.menuData;
  const items = m.sections.reduce((a, s) => a + s.items.length, 0);
  // We will never outrank the restaurant's own menu on "[name] menu". But a big share of those
  // searchers are really asking "what should I order here?", and that is the one question we
  // answer better than anyone, so the snippet leads with The Order.
  const { title, description } = menuSnippet(spot, items, m.sections.map((s) => s.name));
  const og = ogMenu(spot, description);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/r/${slug}/menu` },
    openGraph: { title: og.title, description: og.description, type: og.type, images: og.image ? [og.image] : undefined },
    twitter: og.twitter,
  };
}

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const spot = await getSpot(slug);
  if (!spot || !spot.menuData) notFound();
  const m = spot.menuData;
  const itemCount = m.sections.reduce((a, s) => a + s.items.length, 0);
  const picked = m.extracted ? new Date(m.extracted + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null;

  // Built by the shared builders in lib/seo.ts so the admin SEO desk previews exactly this. The
  // `menu` URL is the only menu property Google documents; the rich hasMenu tree is for AI engines.
  const jsonLd = restaurantLdMenu(spot);
  const crumbLd = breadcrumbLdMenu(spot);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(crumbLd) }} />

      <header className="border-b-2 border-ink">
        <div className="max-w-4xl mx-auto px-5 pt-8 pb-6">
          <nav className="font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft mb-4">
            <Link href="/" className="hover:text-chile">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/r/${slug}`} className="hover:text-chile">{spot.name}</Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink">Menu</span>
          </nav>
          <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-2">The Menu · Picked up in person</p>
          <h1 className="font-display font-black text-ink leading-[0.95] tracking-[-0.02em]" style={{ fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }}>
            {spot.name} Menu
          </h1>
          <p className="mt-3 font-ui text-sm text-ink-soft">
            {[spot.addressLine, spot.phone, spot.hoursToday ? `Today: ${spot.hoursToday.replace(/^[A-Za-z]+:\s*/, '')}` : null].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-4 font-hand text-xl text-oxblood">
            {m.note || `No squinting at a blurry PDF: I walked in, got the menu, and typed up every dish so you can read it like a local.`}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <VerdictStamp rating={spot.ratingGoogle} label={spot.verdict} className="text-sm" />
            <Link href={`/r/${slug}`} className="font-stamp uppercase tracking-[0.08em] text-xs text-chile underline underline-offset-2 hover:text-oxblood">Read the review →</Link>
            {spot.orderUrl && <a href={spot.orderUrl} target="_blank" rel="noopener noreferrer" className="font-stamp uppercase tracking-[0.08em] text-xs bg-ink text-paper px-3 py-1.5 rounded-sm hover:bg-chile">Order online ↗</a>}
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-5 py-10">
        <p className="font-stamp uppercase tracking-[0.12em] text-ink-soft text-xs mb-8">
          {itemCount} dishes · {m.sections.length} sections{picked ? ` · menu photographed ${picked}` : ''}
        </p>
        <div className="columns-1 md:columns-2 gap-10">
          {m.sections.map((s) => (
            <section key={s.name} className="break-inside-avoid mb-10">
              <h2 className="font-display font-bold text-2xl text-ink border-b-2 border-ink pb-1 mb-1">{s.name}</h2>
              {s.note && <p className="font-ui text-xs text-ink-soft italic mb-2 mt-1">{s.note}</p>}
              <ul className="mt-3 space-y-2.5">
                {s.items.map((it) => (
                  <li key={it.name}>
                    <div className="flex items-baseline gap-2">
                      <span className="font-ui font-semibold text-[0.95rem] text-ink">{it.name}</span>
                      <span className="flex-1 border-b border-dotted border-rule translate-y-[-3px]" aria-hidden />
                      {showPrice(it.price) && <span className="font-ui text-sm text-oxblood font-semibold whitespace-nowrap">{showPrice(it.price)}</span>}
                    </div>
                    {it.desc && <p className="font-ui text-xs text-ink-soft leading-snug mt-0.5">{it.desc}</p>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="font-ui text-xs text-ink-soft border-t border-rule pt-4 mt-2">
          Transcribed from the printed menu{picked ? ` (${picked})` : ''}. Prices drift and specials rotate; the kitchen has the final word.
          Spotted a change? <Link href="/contact" className="text-chile underline underline-offset-2">Tell me</Link> and I&apos;ll fix it.
        </p>
      </section>

      {spot.menus.length > 0 && (
        <section className="border-t border-rule bg-paper-raised">
          <div className="max-w-4xl mx-auto px-5 py-8">
            <h2 className="font-stamp uppercase tracking-[0.15em] text-chile text-sm mb-1">📋 The receipts</h2>
            <p className="font-ui text-xs text-ink-soft mb-3">The actual menu, straight from the counter. Tap to zoom.</p>
            <MenuViewer menus={spot.menus} />
          </div>
        </section>
      )}

      <section className="border-t-2 border-ink bg-ink text-paper">
        <div className="max-w-4xl mx-auto px-5 py-8 flex flex-wrap items-center justify-between gap-4">
          <p className="font-hand text-2xl text-amber">So, is it any good?</p>
          <Link href={`/r/${slug}`} className="font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-5 py-2.5 rounded-sm hover:bg-oxblood">
            Read the {spot.name} review →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
