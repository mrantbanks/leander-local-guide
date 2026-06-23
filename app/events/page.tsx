'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import ListingCard from '@/components/ListingCard';
import SiteFooter from '@/components/SiteFooter';
import { listings } from '@/data/listings';

type FilterType = 'All' | 'Open Now' | 'Hidden Gems' | 'Food Trucks';

const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function isOpenNow(hoursDetail?: Record<string, { open: string; close: string } | undefined>) {
  if (!hoursDetail) return false;
  const today = hoursDetail[days[new Date().getDay()]];
  if (!today) return false;
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const [oh, om] = today.open.split(':').map(Number);
  const [ch, cm] = today.close.split(':').map(Number);
  return now >= oh * 60 + om && now < ch * 60 + cm;
}

export default function BrowsePage() {
  const [active, setActive] = useState<FilterType>('All');
  const filters: FilterType[] = ['All', 'Open Now', 'Hidden Gems', 'Food Trucks'];

  const results = useMemo(() => {
    const sorted = [...listings].sort((a, b) => b.rating - a.rating);
    if (active === 'Open Now') return sorted.filter((l) => isOpenNow(l.hoursDetail));
    if (active === 'Hidden Gems') return sorted.filter((l) => l.tags.includes('Hidden Gem'));
    if (active === 'Food Trucks') return sorted.filter((l) => l.tags.includes('Food Truck'));
    return sorted;
  }, [active]);

  return (
    <main>
      <header className="border-b-2 border-ink">
        <div className="max-w-6xl mx-auto px-5 pt-8 pb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft hover:text-chile transition-colors mb-4"
          >
            ← Back to the guide
          </Link>
          <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-2">Leander, Texas</p>
          <h1
            className="font-display font-black text-ink leading-[0.92] tracking-[-0.02em]"
            style={{ fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }}
          >
            Find Your Spot
          </h1>
          <p className="mt-3 font-ui text-ink-soft max-w-xl">
            What are you in the mood for? Filter the whole guide down to tonight.
          </p>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 py-10">
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {filters.map((f) => {
            const on = active === f;
            return (
              <button
                key={f}
                onClick={() => setActive(f)}
                aria-pressed={on}
                className={`font-stamp uppercase tracking-[0.08em] text-sm px-4 py-1.5 border-2 rounded-[2px] -rotate-1 transition-colors ${
                  on ? 'bg-chile text-paper border-chile' : 'text-ink border-rule hover:border-ink'
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12">
            {results.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <p className="font-hand text-2xl text-oxblood">Nothing open on that filter right now. Try another.</p>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
