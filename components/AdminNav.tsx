import Link from 'next/link';
import { pool } from '@/lib/db';
import { signOut } from '@/auth';

export default async function AdminNav({ active }: { active?: string }) {
  const pend = await pool.query(
    "select ((select count(*) from photos where status='pending')+(select count(*) from tips where status='pending')+(select count(*) from reviews where status='pending')+(select count(*) from claims where status='pending')+(select count(*) from events where status='pending'))::int n"
  );
  const pending = pend.rows[0].n as number;
  const item = (href: string, label: string, badge?: number) => (
    <Link href={href} className={`font-stamp uppercase tracking-[0.08em] text-sm ${active === href ? 'text-chile' : 'text-ink-soft hover:text-ink'} transition-colors`}>
      {label}{badge ? ` (${badge})` : ''}
    </Link>
  );
  return (
    <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b-2 border-ink pb-3 mb-6">
      <span className="font-display font-black text-xl text-ink mr-2">Newsroom</span>
      {item('/admin', 'Dashboard')}
      {item('/admin/spots', 'Spots')}
      {item('/admin/moderation', 'Moderation', pending)}
      {item('/admin/workers', 'Workers')}
      <form action={async () => { 'use server'; await signOut({ redirectTo: '/admin' }); }} className="ml-auto">
        <button className="font-stamp uppercase tracking-[0.08em] text-sm text-chile hover:text-oxblood">Sign out</button>
      </form>
    </nav>
  );
}
