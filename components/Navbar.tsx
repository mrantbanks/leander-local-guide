'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchBar from './SearchBar';

// Committee-trimmed nav: "Food" killed (was a duplicate of "Eat"), "Hidden Gems"
// folded into Best Of. hide:true links show inline on desktop; on mobile they live
// in the "More" overflow menu so nothing's unreachable on a phone.
const links = [
  { label: 'Eat', href: '/', hide: false },
  { label: 'Map', href: '/map', hide: false },
  { label: "What's On", href: '/whats-on', hide: false },
  { label: 'Passport', href: '/passport', hide: true },
  { label: 'Best Of', href: '/best', hide: true },
  { label: 'New', href: '/new', hide: true },
  { label: 'Anthony', href: '/about', hide: true },
];

const overflow = links.filter((l) => l.hide);

export default function Navbar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close the mobile "More" menu whenever we navigate.
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // Close on outside tap / Escape while open.
  useEffect(() => {
    if (!moreOpen) return;
    function onDoc(e: MouseEvent) { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMoreOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [moreOpen]);

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

          {/* Mobile-only overflow: houses the desktop-only links so a phone can reach them too. */}
          <div ref={moreRef} className="relative sm:hidden shrink-0">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((o) => !o)}
              className={`flex items-center gap-0.5 font-stamp uppercase tracking-[0.06em] text-[13px] px-2 py-1 transition-colors duration-150 ${moreOpen ? 'text-chile' : 'text-ink-soft hover:text-ink'}`}
            >
              More <span aria-hidden="true" className={`inline-block text-[10px] transition-transform duration-150 ${moreOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {moreOpen && (
              <ul role="menu" className="absolute right-0 top-full mt-1 min-w-[9.5rem] bg-paper-raised border border-rule rounded-[2px] shadow-xl py-1 z-50">
                {overflow.map(({ label, href }) => {
                  const isActive = pathname === href;
                  return (
                    <li key={href} role="none">
                      <Link
                        role="menuitem"
                        href={href}
                        className={`block font-stamp uppercase tracking-[0.06em] text-sm px-3 py-2 transition-colors ${isActive ? 'bg-chile text-paper' : 'text-ink-soft hover:bg-paper-sunk hover:text-ink'}`}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <SearchBar />
        </div>
      </div>
    </nav>
  );
}
