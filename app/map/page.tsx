import { getMapPins } from '@/lib/spots';
import MapView from '@/components/MapView';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Map of Leander food',
  description: 'Every restaurant, bar, cafe, brewery and food truck in Leander, TX on one map. Filter by happy hour, hidden gems, and cuisine, then find what is nearest you.',
  alternates: { canonical: '/map' },
};

export default async function MapPage({ searchParams }: { searchParams: Promise<{ spot?: string }> }) {
  const sp = await searchParams;
  const pins = await getMapPins();
  return (
    <>
      <MapView pins={pins} initialSpot={sp.spot || null} />
      {/* SSR fallback: real, crawlable internal links (also the no-JS view). Visually minimal. */}
      <section className="max-w-5xl mx-auto px-5 py-8">
        <h1 className="font-display font-black text-2xl text-ink mb-1">Every spot on the Leander map</h1>
        <p className="font-ui text-sm text-ink-soft mb-4">All {pins.length} restaurants, bars, cafes and food trucks we track in Leander, Texas.</p>
        <ul className="columns-2 sm:columns-3 gap-4 font-ui text-sm">
          {pins.slice().sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
            <li key={p.slug} className="break-inside-avoid mb-1.5">
              <a href={`/r/${p.slug}`} className="text-ink hover:text-chile">{p.name}</a>
              <span className="text-ink-soft text-xs"> · {p.cat}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
