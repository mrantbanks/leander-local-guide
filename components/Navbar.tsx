'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from './SearchBar';

// Committee-trimmed nav: "Food" killed (was a duplicate of "Eat"), "Hidden Gems"
// folded into Best Of. New + Anthony stay desktop-only so mobile + search fit.
const links = [
  { label: 'Eat', href: '/', hide: false },
  { label: 'Map', href: '/map', hide: false },
  { label: "What's On", href: '/whats-on', hide: false },
  { label: 'Best Of', href: '/best', hide: true },
  { label: 'New', href: '/new', hide: true },
  { label: 'Anthony', href: '/about', hide: true },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 bg-paper/95 backdrop-blur-sm border-b border-rule">
      <div className="max-w-6xl mx-auto px-4 sm:px-5 flex items-center justify-between gap-2 h-14">
        <Link href="/" className="flex items-baseline gap-2 shrink-0">
          <span className="font-display font-black text-lg sm:text-xl tracking-tight text-ink">Leander Local</span>
          <span className="hidden md:inline font-stamp uppercase tracking-[0.18em] text-[11px] text-chile">Local First</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <ul className="flex items-center gap-0.5">
            {links.map(({ label, href, hide }) => {
              const isActive = pathname === href;
              return (
                <li key={href} className={`shrink-0 ${hide ? 'hidden sm:list-item' : ''}`}>
                  <Link
                    href={href}
                    className={`font-stamp uppercase tracking-[0.06em] text-[13px] sm:text-sm px-2 sm:px-2.5 py-1 transition-colors duration-150 ${isActive ? 'text-chile' : 'text-ink-soft hover:text-ink'}`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <SearchBar />
        </div>
      </div>
    </nav>
  );
}
