import Link from 'next/link';
import type { InkItem } from '@/lib/spots';

const TAG: Record<InkItem['kind'], { label: string; cls: string }> = {
  new: { label: 'New', cls: 'text-amber-700 border-amber-600/60' },
  rave: { label: 'Rave', cls: 'text-oxblood border-oxblood/60' },
  buzz: { label: 'Buzz', cls: 'text-chile border-chile/60' },
};

/**
 * The ticker under the masthead. One line, scrolls sideways, like a newspaper strap.
 *
 * The original cut its third item clean through the middle at the container edge, with no scrollbar
 * (no-scrollbar) and no fade, so it did not read as "there is more, scroll", it read as broken. The
 * fix is not to wrap it (that dumps the whole list into the masthead and kills the strap); it is to
 * SAY that it scrolls. A fade on the right edge, and the scroll snaps so an item never parks
 * half-visible once you have moved it.
 */
export default function FreshInk({ items, dateline }: { items: InkItem[]; dateline: string }) {
  if (!items.length) return null;

  return (
    <section className="border-b border-rule bg-paper-raised">
      <div className="max-w-6xl mx-auto px-5 py-2.5 flex items-center gap-4">
        <span className="font-stamp uppercase tracking-[0.18em] text-chile text-sm whitespace-nowrap shrink-0">Fresh Ink</span>
        <span className="hidden sm:inline font-stamp uppercase tracking-[0.1em] text-sm text-ink-soft whitespace-nowrap shrink-0">{dateline}</span>

        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-1 pr-10">
            {items.map((it, i) => (
              <Link
                key={it.slug + i}
                href={`/r/${it.slug}`}
                className="group flex items-center gap-2 whitespace-nowrap shrink-0 snap-start"
              >
                <span className={`font-stamp uppercase tracking-[0.06em] text-sm px-1.5 py-0.5 border rounded-[2px] -rotate-1 ${TAG[it.kind].cls}`}>
                  {TAG[it.kind].label}
                </span>
                <span className="font-display font-semibold text-ink text-sm group-hover:text-oxblood transition-colors">{it.name}</span>
                {it.note && <span className="font-ui text-xs text-ink-soft">{it.note}</span>}
              </Link>
            ))}
          </div>

          {/* The whole point: a half-visible item now obviously means "keep going", not "broken". */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-paper-raised via-paper-raised/80 to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 font-stamp text-ink-soft text-sm"
          >
            →
          </span>
        </div>
      </div>
    </section>
  );
}
