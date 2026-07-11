import Link from 'next/link';
import Tag from '@/components/Tag';
import VerdictStamp from '@/components/VerdictStamp';
import SignalBar from '@/components/SignalBar';
import CardStatus from '@/components/CardStatus';
import type { CardSpot } from '@/lib/spots';

const categoryIcons: Record<string, string> = {
  Restaurant: '🍽️', 'Food Truck': '🚚', Cafe: '☕', Bakery: '🥐', Bar: '🍸', Brewery: '🍺', Dessert: '🍦',
};

// Committee priority order; max 3 editorial badges per card so the zine look stays clean.
const BADGE_RANK = ['Coming Soon', "Anthony's Pick", 'Hidden Gem', 'Local Favorite', 'New', 'Food Truck', 'Local', 'Patio', 'Dog-Friendly', 'Veg', 'Happy Hour'];

export default function SpotCard({ spot, priority = false }: { spot: CardSpot; priority?: boolean }) {
  const icon = categoryIcons[spot.category] ?? '📍';
  const badges = [...new Set([...(spot.visited ? ["Anthony's Pick"] : []), ...spot.badges])]
    .sort((a, b) => { const ia = BADGE_RANK.indexOf(a), ib = BADGE_RANK.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); })
    .slice(0, 3);
  // Google image is the card default; a promoted local header overrides it. Local is fallback only if no Google photo.
  const localImg = spot.headerPhoto || (!spot.photo ? (spot.localPhotos[0] ?? null) : null);
  return (
    <div className="group relative flex flex-col">
      <Link href={`/r/${spot.slug}`} className="flex flex-col focus-visible:outline-none">
        <div className="relative aspect-[5/4] bg-paper-sunk border border-rule overflow-hidden transition-colors duration-150 group-hover:border-ink">
          {localImg ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`${localImg.url}?w=800`}
              alt={spot.name}
              width={800}
              height={640}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : undefined}
              className="absolute inset-0 w-full h-full object-cover grayscale-[0.12] contrast-110 transition-[filter] duration-200 ease-out group-hover:grayscale-0"
            />
          ) : spot.photo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/img?n=${encodeURIComponent(spot.photo)}&w=800`}
                srcSet={`/img?n=${encodeURIComponent(spot.photo)}&w=400 400w, /img?n=${encodeURIComponent(spot.photo)}&w=800 800w`}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                alt={spot.name}
                width={800}
                height={640}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : undefined}
                className="absolute inset-0 w-full h-full object-cover grayscale-[0.18] contrast-125 sepia-[0.08] transition-[filter] duration-200 ease-out group-hover:grayscale-0 group-hover:sepia-0"
              />
              {spot.photoCredit && (
                <span className="absolute left-1.5 bottom-1 text-[12px] text-paper/80 bg-ink/45 px-1 rounded-sm">📷 {spot.photoCredit}</span>
              )}
            </>
          ) : (
            <div aria-hidden className="absolute inset-0 grid place-items-center bg-gradient-to-br from-paper-sunk to-rule/40">
              <div className="text-center px-3">
                <div className="text-5xl opacity-45">{icon}</div>
                <div className="font-stamp uppercase tracking-[0.18em] text-[12px] text-ink-soft mt-1.5">{spot.category}</div>
              </div>
            </div>
          )}
          <div className="absolute left-3 top-3 z-[1] flex flex-col items-start gap-1.5">
            <span className="font-stamp uppercase tracking-[0.12em] text-[12px] text-ink-soft bg-paper/70 px-1 rounded-sm">{spot.category}</span>
            <CardStatus periods={spot.periods} open24={spot.open24} openLate={spot.openLate} />
          </div>
          <VerdictStamp rating={spot.comingSoon ? undefined : spot.ratingGoogle} label={spot.comingSoon ? 'COMING SOON' : spot.verdict} className="absolute right-2 top-2 bg-paper-raised/90 text-[13px]" />
        </div>

        <div className="relative -mt-5 mx-3 z-10">
          <h3 className="inline-block bg-paper px-2 py-1 font-display font-semibold leading-[1.05] text-ink text-[1.5rem] group-hover:text-oxblood transition-colors">
            {spot.name}
          </h3>
          <span className="block h-[2px] w-0 bg-chile transition-all duration-300 ease-out group-hover:w-16 ml-2 mt-1" />
        </div>

        {spot.hook && (
          <p className="px-3 mt-2 font-hand text-[1.18rem] leading-snug text-oxblood line-clamp-2">“{spot.hook}”</p>
        )}

        <div className="px-3 mt-3 flex items-center gap-3 flex-wrap">
          {spot.ratingGoogle != null && <span className="font-ui text-xs text-ink-soft">{spot.ratingGoogle}★ <span className="opacity-60">Google</span></span>}
          {spot.priceTier ? <span className="font-ui text-xs text-ink-soft">{'$'.repeat(spot.priceTier)}</span> : null}
          {spot.cuisines.length > 0 && <span className="font-ui text-xs text-ink-soft">{spot.cuisines.slice(0, 2).join(', ')}</span>}
          {spot.beenHere >= 3 && <span className="font-stamp uppercase tracking-[0.08em] text-[12px] text-ink-soft">{spot.beenHere} been here</span>}
        </div>

        {spot.happyHour && (
          <p className="px-3 mt-2 font-ui text-xs text-ink leading-snug line-clamp-2">
            <span className="font-stamp uppercase tracking-[0.08em] text-chile text-[12px]">Happy Hour · </span>
            {spot.happyHour.replace(/^happy hour[:\s-]*/i, '')}
          </p>
        )}

        {badges.length > 0 && (
          <div className="px-3 mt-3 flex flex-wrap gap-1.5">
            {badges.map((b) => <Tag key={b} label={b} />)}
          </div>
        )}

        <div className="mt-3 mx-3 pt-2 border-t border-rule flex items-center justify-between gap-3 font-ui text-xs text-ink-soft">
          <span className="truncate">{spot.addressLine}</span>
          {spot.hoursToday && <span className="flex-shrink-0 truncate max-w-[45%]">{spot.hoursToday.replace(/^[A-Za-z]+:\s*/, '')}</span>}
        </div>
      </Link>

      {/* one-tap verdict (outside the link so taps don't navigate) */}
      <div className="px-3 mt-3">
        <SignalBar placeId={spot.id} compact initial={{ worthIt: spot.worthIt, itsFine: spot.itsFine, skipIt: spot.skipIt, beenHere: spot.beenHere, wantToGo: spot.wantToGo }} />
      </div>
    </div>
  );
}
