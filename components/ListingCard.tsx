import Tag from '@/components/Tag';
import VerdictStamp from '@/components/VerdictStamp';
import { Listing } from '@/data/listings';

const categoryIcons: Record<string, string> = {
  Food: '🌮', Drink: '🍹', Coffee: '☕', Bar: '🥃', Brewery: '🍺',
};

export default function ListingCard({ listing }: { listing: Listing }) {
  const icon = listing.tags.includes('Food Truck')
    ? '🚚'
    : categoryIcons[listing.category] ?? '📍';

  return (
    <article className="group relative flex flex-col">
      {/* Photo well, duotone newsprint block (real photos arrive with the live data) */}
      <div className="relative aspect-[5/4] bg-paper-sunk border border-rule overflow-hidden transition-colors duration-150 group-hover:border-ink">
        <span aria-hidden className="absolute inset-0 grid place-items-center text-6xl opacity-25 grayscale">
          {icon}
        </span>
        <span className="absolute left-3 top-3 font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft">
          {listing.category}
        </span>
        <VerdictStamp rating={listing.rating} className="absolute right-2 top-2 bg-paper-raised/90 text-sm" />
      </div>

      {/* Name, overlaps the well, on a paper sliver */}
      <div className="relative -mt-5 mx-3 z-10">
        <h3 className="inline-block bg-paper px-2 py-1 font-display font-semibold leading-[1.05] text-ink text-[1.55rem]">
          {listing.name}
        </h3>
        <span className="block h-[2px] w-0 bg-chile transition-all duration-300 ease-out group-hover:w-16 ml-2 mt-1" />
      </div>

      {/* Anthony's one-liner (his hand) */}
      <p className="px-3 mt-2 font-hand text-[1.15rem] leading-snug text-oxblood line-clamp-2">
        “{listing.description}”
      </p>

      {/* Hand-inked rating numeral */}
      <div className="px-3 mt-3 flex items-baseline gap-1.5">
        {listing.rating != null && (
          <span className="font-hand text-3xl text-chile leading-none">{listing.rating}</span>
        )}
        <span className="font-stamp uppercase tracking-[0.1em] text-sm text-ink-soft">· Anthony's call</span>
      </div>

      {/* Badges */}
      {listing.tags.length > 0 && (
        <div className="px-3 mt-3 flex flex-wrap gap-1.5">
          {listing.tags.slice(0, 4).map((t) => (
            <Tag key={t} label={t} />
          ))}
        </div>
      )}

      {/* Footer hairline */}
      <div className="mt-3 mx-3 pt-2 border-t border-rule flex items-center justify-between gap-3 font-ui text-xs text-ink-soft">
        <span className="truncate">{listing.address}</span>
        {listing.hours && <span className="flex-shrink-0">{listing.hours}</span>}
      </div>
    </article>
  );
}
