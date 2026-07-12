'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * The owner desk used to be one long scrolling page: stats, then every fact about the business, then
 * perks, all stacked. An owner with ninety seconds could not find anything, and there was nowhere to
 * put events without making it worse. Same shape as the admin sidebar, so there is one idea of what
 * a desk looks like on this site.
 */
const ITEMS: [string, string, string][] = [
  ['', 'Overview', 'How you are doing'],
  ['/details', 'Your details', 'Hours, phone, links'],
  ['/events', "What's On", 'Trivia, live music'],
  ['/passport', 'Local Passport', 'Your perk'],
];

export default function OwnerSidebar({ slug, name }: { slug: string; name: string }) {
  const path = usePathname() || '';
  const base = `/owner/${slug}`;

  return (
    <nav className="sm:w-56 sm:shrink-0 sm:border-r-2 sm:border-ink sm:min-h-[80vh] sm:pr-4">
      <div className="border-b-2 border-ink sm:border-0 pb-3 sm:pb-0 mb-3 sm:mb-4">
        <p className="font-stamp uppercase tracking-[0.18em] text-chile text-xs">Owner desk</p>
        <p className="font-display font-black text-ink text-xl leading-tight">{name}</p>
      </div>

      <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible">
        {ITEMS.map(([href, label, hint]) => {
          const to = `${base}${href}`;
          const active = href === '' ? path === base : path.startsWith(to);
          return (
            <Link
              key={label}
              href={to}
              className={`shrink-0 sm:shrink px-3 py-2 rounded-[2px] transition-colors ${
                active ? 'bg-chile text-paper' : 'text-ink-soft hover:bg-paper-raised hover:text-ink'
              }`}
            >
              <span className="block font-stamp uppercase tracking-[0.08em] text-sm">{label}</span>
              <span className={`hidden sm:block font-ui text-xs ${active ? 'text-paper/80' : 'text-ink-soft/70'}`}>{hint}</span>
            </Link>
          );
        })}
      </div>

      <Link
        href={`/r/${slug}`}
        target="_blank"
        className="hidden sm:block mt-5 pt-4 border-t border-rule font-stamp uppercase tracking-[0.08em] text-xs text-chile hover:text-oxblood px-3"
      >
        View your live page →
      </Link>
    </nav>
  );
}
