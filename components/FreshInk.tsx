import Link from 'next/link';
import type { InkItem } from '@/lib/spots';

const TAG: Record<InkItem['kind'], { label: string; cls: string }> = {
  new: { label: 'New', cls: 'text-amber-700 border-amber-600/60' },
  rave: { label: 'Rave', cls: 'text-oxblood border-oxblood/60' },
  buzz: { label: 'Buzz', cls: 'text-chile border-chile/60' },
};

/**
 * The ticker under the masthead. It scrolls itself, like the strap on a news channel.
 *
 * Three goes at this. The original cut its third item clean through the middle with no scrollbar and
 * no fade, so it read as broken. Wrapping it dumped the whole list into the masthead and killed the
 * strap. A fade with a decorative arrow was worse than useless: it LOOKED like a control and did
 * nothing when you moused over it.
 *
 * So it actually moves. The list is rendered twice, end to end, and the track slides left by exactly
 * half its width before snapping back, which lands on a seamless loop because the second copy is
 * sitting exactly where the first one was. Hover pauses it (you cannot click a moving target), and
 * anyone who has asked their machine for less motion gets a static, scrollable strip instead.
 */
export default function FreshInk({ items, dateline }: { items: InkItem[]; dateline: string }) {
  if (!items.length) return null;

  const strip = (ariaHidden: boolean) => (
    <div className="flex items-center gap-5 shrink-0 pr-5" aria-hidden={ariaHidden || undefined}>
      {items.map((it, i) => (
        <Link
          key={`${it.slug}-${i}-${ariaHidden}`}
          href={`/r/${it.slug}`}
          tabIndex={ariaHidden ? -1 : undefined}
          className="group flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <span className={`font-stamp uppercase tracking-[0.06em] text-sm px-1.5 py-0.5 border rounded-[2px] -rotate-1 ${TAG[it.kind].cls}`}>
            {TAG[it.kind].label}
          </span>
          <span className="font-display font-semibold text-ink text-sm group-hover:text-oxblood transition-colors">{it.name}</span>
          {it.note && <span className="font-ui text-xs text-ink-soft">{it.note}</span>}
        </Link>
      ))}
    </div>
  );

  return (
    <section className="border-b border-rule bg-paper-raised">
      <div className="max-w-6xl mx-auto px-5 py-2.5 flex items-center gap-4">
        <span className="font-stamp uppercase tracking-[0.18em] text-chile text-sm whitespace-nowrap shrink-0">Fresh Ink</span>
        <span className="hidden sm:inline font-stamp uppercase tracking-[0.1em] text-sm text-ink-soft whitespace-nowrap shrink-0">{dateline}</span>

        <div className="llg-ticker relative min-w-0 flex-1 overflow-hidden">
          <div className="llg-ticker-track flex items-center w-max">
            {strip(false)}
            {strip(true)}
          </div>
          {/* Soft edges so items enter and leave rather than popping. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-paper-raised to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-paper-raised to-transparent" />
        </div>
      </div>
    </section>
  );
}
