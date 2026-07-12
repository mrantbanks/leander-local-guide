import Link from 'next/link';
import type { InkItem } from '@/lib/spots';

const TAG: Record<InkItem['kind'], { label: string; cls: string }> = {
  new: { label: 'New', cls: 'text-amber-700 border-amber-600/60' },
  rave: { label: 'Rave', cls: 'text-oxblood border-oxblood/60' },
  buzz: { label: 'Buzz', cls: 'text-chile border-chile/60' },
};

/**
 * The ticker under the masthead.
 *
 * It used to be one no-wrap row inside `overflow-x-auto`, so on a normal laptop the third item was
 * sliced clean through the middle at the container edge, with no scrollbar (no-scrollbar) and no
 * fade to say there was more. It did not read as "scroll me", it read as broken.
 *
 * Now: it WRAPS on anything tablet-sized and up, so an item is never cut. On a phone it still scrolls
 * sideways, which is the right gesture there, but with a fade on the right edge so a half-visible
 * item is obviously the start of more and not a rendering bug.
 */
export default function FreshInk({ items, dateline }: { items: InkItem[]; dateline: string }) {
  if (!items.length) return null;

  return (
    <section className="border-b border-rule bg-paper-raised">
      <div className="max-w-6xl mx-auto px-5 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="font-stamp uppercase tracking-[0.18em] text-chile text-sm whitespace-nowrap shrink-0">Fresh Ink</span>
        <span className="hidden sm:inline font-stamp uppercase tracking-[0.1em] text-sm text-ink-soft whitespace-nowrap shrink-0">{dateline}</span>

        {/* The fade only exists while the strip can actually scroll, which is only on a phone. */}
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-x-5 gap-y-1.5 overflow-x-auto no-scrollbar sm:overflow-visible sm:flex-wrap pr-8 sm:pr-0">
            {items.map((it, i) => (
              <Link key={it.slug + i} href={`/r/${it.slug}`} className="group flex items-center gap-2 whitespace-nowrap shrink-0 py-0.5">
                <span className={`font-stamp uppercase tracking-[0.06em] text-sm px-1.5 py-0.5 border rounded-[2px] -rotate-1 ${TAG[it.kind].cls}`}>
                  {TAG[it.kind].label}
                </span>
                <span className="font-display font-semibold text-ink text-sm group-hover:text-oxblood transition-colors">{it.name}</span>
                {it.note && <span className="font-ui text-xs text-ink-soft">{it.note}</span>}
              </Link>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="sm:hidden pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-paper-raised to-transparent"
          />
        </div>
      </div>
    </section>
  );
}
