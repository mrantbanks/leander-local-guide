import Link from 'next/link';
import { listings } from '@/data/listings';
import ListingCard from '@/components/ListingCard';

const hiddenGems = listings.filter((l) => l.tags.includes('Hidden Gem'));

export default function HiddenGemsPage() {
  return (
    <main className="min-h-screen">

      {/* Hero */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 py-7">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-700 transition-colors mb-4"
          >
            ← Back to all spots
          </Link>
          <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-2">
            Leander, Texas
          </p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            💎 Hidden Gems
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 max-w-sm leading-relaxed">
            Under the radar. Worth finding. {hiddenGems.length} spots the locals keep quiet.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {hiddenGems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hiddenGems.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No hidden gems found yet — check back soon.</p>
        )}
      </div>

      <footer className="border-t border-stone-200 bg-white mt-2">
        <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span className="font-semibold text-gray-600">Leander Local Guide</span>
          <span>Made by a local · No ads · No affiliates · No chains</span>
        </div>
      </footer>

    </main>
  );
}
