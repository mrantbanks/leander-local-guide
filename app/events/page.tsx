'use client';

import { useMemo, useState } from 'react';
import ListingCard from '@/components/ListingCard';
import { listings } from '@/data/listings';

type FilterType = 'All' | 'Open Now' | 'Hidden Gems' | 'Food Trucks';

function getTodayKey() {
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;

  return days[new Date().getDay()];
}

function isOpenNow(hoursDetail?: {
  sunday?: { open: string; close: string };
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
}) {
  if (!hoursDetail) return false;

  const today = getTodayKey();
  const todayHours = hoursDetail[today];

  if (!todayHours) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = todayHours.open.split(':').map(Number);
  const [closeH, closeM] = todayHours.close.split(':').map(Number);

  const open = openH * 60 + openM;
  const close = closeH * 60 + closeM;

  return currentMinutes >= open && currentMinutes < close;
}

export default function HomePage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

  const filteredListings = useMemo(() => {
    const sorted = [...listings].sort((a, b) => b.rating - a.rating);

    if (activeFilter === 'Open Now') {
      return sorted.filter((listing) => isOpenNow(listing.hoursDetail));
    }

    if (activeFilter === 'Hidden Gems') {
      return sorted.filter((listing) => listing.tags.includes('Hidden Gem'));
    }

    if (activeFilter === 'Food Trucks') {
      return sorted.filter((listing) => listing.tags.includes('Food Truck'));
    }

    return sorted;
  }, [activeFilter]);

  const topPicks = [...listings].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const hiddenGemsPreview = listings
    .filter((listing) => listing.tags.includes('Hidden Gem'))
    .slice(0, 2);

  const filters: FilterType[] = ['All', 'Open Now', 'Hidden Gems', 'Food Trucks'];

  return (
    <main className="min-h-screen bg-stone-50">
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-3">
            Leander, Texas
          </p>
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            The Leander Local Guide
          </h1>
          <p className="mt-3 text-gray-500 text-base max-w-2xl">
            Find the best food, drinks, hidden gems, and local hangouts in Leander.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-sm font-medium">
              Local Favorites
            </span>
            <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-sm font-medium">
              Hidden Gems
            </span>
            <span className="rounded-full bg-stone-100 text-stone-700 px-3 py-1 text-sm font-medium">
              Not a Chain
            </span>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {filters.map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        <div className="mb-8">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            {activeFilter}
          </p>
          {filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No spots match this filter right now.
            </p>
          )}
        </div>
      </section>

      {activeFilter === 'All' && (
        <>
          <section className="max-w-4xl mx-auto px-6 pb-10">
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Top Picks This Week
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {topPicks.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </div>
          </section>

          <section className="max-w-4xl mx-auto px-6 pb-12">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Hidden Gems
              </p>
              <a
                href="/hidden-gems"
                className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                View all
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {hiddenGemsPreview.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}