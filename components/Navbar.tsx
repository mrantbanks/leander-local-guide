'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { label: 'Eat',          href: '/' },
  { label: 'Best Of',      href: '/best' },
  { label: 'Food',         href: '/food' },
  { label: 'Hidden Gems',  href: '/hidden-gems' },
  { label: 'Anthony',      href: '/about' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-paper/95 backdrop-blur-sm border-b border-rule">
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-14">
        <Link href="/" className="flex items-baseline gap-2.5">
          <span className="font-display font-black text-xl tracking-tight text-ink">Leander Local</span>
          <span className="hidden sm:inline font-stamp uppercase tracking-[0.18em] text-[11px] text-chile">
            Local First
          </span>
        </Link>

        <ul className="flex items-center gap-0.5">
          {links.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`font-stamp uppercase tracking-[0.08em] text-sm px-2.5 py-1 transition-colors duration-150 ${
                    isActive ? 'text-chile' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
