import Link from 'next/link';
import { listings } from '@/data/listings';
import ListingCard from '@/components/ListingCard';

// ── Derived data ──────────────────────────────────────────────────────────────
const topPicks = [...listings]
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 3);

const stats = [
  { value: listings.length,                                                         label: 'Local Spots'    },
  { value: listings.filter(l => l.tags.includes('Hidden Gem')).length,             label: 'Hidden Gems'    },
  { value: listings.filter(l => l.tags.includes('Not a Chain')).length,            label: 'Not a Chain'    },
];

const filterPills = [
  { label: 'Hidden Gems', href: '/hidden-gems', emoji: '💎' },
  { label: 'Food',         href: '/food',         emoji: '🌮' },
  { label: 'Events',       href: '/events',       emoji: '📅' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="min-h-screen">

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 py-7">

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">

            {/* Title block */}
            <div>
              <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-2">
                Leander, Texas
              </p>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                The Leander Local Guide
              </h1>
              <p className="mt-2 text-sm text-gray-500 max-w-xs leading-relaxed">
                Skip the chains. Find the spots that actually make Leander worth staying in.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-4 sm:flex-col sm:items-end sm:gap-2">
              {stats.map(({ value, label }) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-gray-900 leading-none">{value}</span>
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              ))}
            </div>

          </div>

          {/* Filter pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {filterPills.map(({ label, href, emoji }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-stone-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 border border-transparent hover:border-emerald-100 transition-all duration-150"
              >
                <span>{emoji}</span>
                {label}
              </Link>
            ))}
          </div>

        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* ─── Top Picks ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            eyebrow="This Week"
            title="Top Picks"
            subtitle="Highest-rated spots in Leander right now"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topPicks.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>

        {/* ─── All Spots ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="All Local Spots"
            subtitle={`${listings.length} places worth knowing about in Leander`}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>

      </div>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-stone-200 bg-white mt-2">
        <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span className="font-semibold text-gray-600">Leander Local Guide</span>
          <span>Made by a local · No ads · No affiliates · No chains</span>
        </div>
      </footer>

    </main>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow && (
        <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1">{eyebrow}</p>
      )}
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
