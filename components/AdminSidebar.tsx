'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const ITEMS: [string, string][] = [
  ['/admin', 'Dashboard'],
  ['/admin/spots', 'Spots'],
  ['/admin/moderation', 'Moderation'],
  ['/admin/owner-desk', 'Owner Desk'],
  ['/admin/workers', 'Workers'],
  ['/admin/ai', 'AI Engines'],
  ['/admin/email', 'Email'],
  ['/admin/growth', 'Growth'],
];

export default function AdminSidebar({ pending }: { pending: number }) {
  const path = usePathname() || '';
  return (
    <aside className="w-44 sm:w-52 shrink-0 border-r-2 border-ink bg-paper-sunk min-h-screen sticky top-0 self-start flex flex-col">
      <div className="px-4 py-4 border-b border-rule">
        <Link href="/admin" className="font-display font-black text-lg text-ink leading-tight block">The Leander Local</Link>
        <p className="font-stamp uppercase tracking-[0.14em] text-sm text-chile mt-0.5">Newsroom · Admin</p>
      </div>
      <nav className="flex flex-col p-2 gap-0.5">
        {ITEMS.map(([href, label]) => {
          const active = href === '/admin' ? path === '/admin' : path.startsWith(href);
          const badge = href === '/admin/moderation' && pending > 0 ? ` (${pending})` : '';
          return (
            <Link key={href} href={href} className={`font-stamp uppercase tracking-[0.08em] text-sm px-3 py-2 rounded-[2px] transition-colors ${active ? 'bg-chile text-paper' : 'text-ink-soft hover:bg-paper-raised hover:text-ink'}`}>
              {label}{badge}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-2 border-t border-rule">
        <Link href="/" className="block font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft hover:text-chile px-3 py-1.5">← View site</Link>
        <button onClick={() => signOut({ callbackUrl: '/admin' })} className="block w-full text-left font-stamp uppercase tracking-[0.08em] text-xs text-chile hover:text-oxblood px-3 py-1.5">Sign out</button>
      </div>
    </aside>
  );
}
