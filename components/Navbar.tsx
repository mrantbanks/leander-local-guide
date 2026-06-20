'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { label: 'Home',         href: '/' },
  { label: 'Food',         href: '/food' },
  { label: 'Hidden Gems',  href: '/hidden-gems' },
  { label: 'Events',       href: '/events' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-12">

        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-sm font-bold text-gray-900 tracking-tight group-hover:text-emerald-700 transition-colors">
            Leander Local
          </span>
          <span className="hidden sm:inline text-xs text-stone-400 border-l border-stone-200 pl-2 font-medium">
            Leander, TX
          </span>
        </Link>

        <ul className="flex items-center">
          {links.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-stone-50'
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
