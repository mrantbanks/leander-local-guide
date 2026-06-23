import Link from 'next/link';
import type { InkItem } from '@/lib/spots';

const TAG: Record<InkItem['kind'], { label: string; cls: string }> = {
  new: { label: 'New', cls: 'text-amber-700 border-amber-600/60' },
  rave: { label: 'Rave', cls: 'text-oxblood border-oxblood/60' },
  buzz: { label: 'Buzz', cls: 'text-chile border-chile/60' },
};

export default function FreshInk({ items, dateline }: { items: InkItem[]; dateline: string }) {
  if (!items.length) return null;
  return (
    <section className="border-b border-rule bg-paper-raised">
      <div className="max-w-6xl mx-auto px-5 py-2.5 flex items-center gap-4">
        <span className="font-stamp uppercase tracking-[0.18em] text-chile text-sm whitespace-nowrap shrink-0">Fresh Ink</span>
        <span className="hidden sm:inline font-stamp uppercase tracking-[0.1em] text-[11px] text-ink-soft whitespace-nowrap shrink-0">{dateline}</span>
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
          {items.map((it, i) => (
            <Link key={it.slug + i} href={`/r/${it.slug}`} className="group flex items-center gap-2 whitespace-nowrap shrink-0">
              <span className={`font-stamp uppercase tracking-[0.06em] text-[11px] px-1.5 py-0.5 border rounded-[2px] -rotate-1 ${TAG[it.kind].cls}`}>{TAG[it.kind].label}</span>
              <span className="font-display font-semibold text-ink text-sm group-hover:text-oxblood transition-colors">{it.name}</span>
              {it.note && <span className="font-ui text-xs text-ink-soft">{it.note}</span>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
