import Link from 'next/link';
import { pool } from '@/lib/db';
import { auth, signIn, signOut } from '@/auth';

export const dynamic = 'force-dynamic';

type AdminUser = { email?: string; name?: string; isAdmin?: boolean };

export default async function AdminPage() {
  const session = await auth();
  const user = session?.user as AdminUser | undefined;

  if (!user) {
    return (
      <main className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="font-display font-black text-4xl text-ink mb-3">Newsroom</h1>
        <p className="font-ui text-sm text-ink-soft mb-8">Sign in to manage Anthony&apos;s reviews.</p>
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/admin' }); }}>
          <button className="font-stamp uppercase tracking-[0.12em] text-base bg-ink text-paper px-7 py-3 hover:bg-chile transition-colors">
            Sign in with Google
          </button>
        </form>
      </main>
    );
  }

  if (!user.isAdmin) {
    return (
      <main className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="font-display font-black text-3xl text-ink mb-2">Not on the list</h1>
        <p className="font-ui text-sm text-ink-soft mb-6">{user.email} isn&apos;t an admin.</p>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/admin' }); }}>
          <button className="font-stamp uppercase tracking-[0.1em] text-sm text-chile">Sign out</button>
        </form>
      </main>
    );
  }

  const { rows } = await pool.query(
    `select slug, name, primary_category cat,
            editorial->>'verdict' verdict,
            coalesce((editorial->>'visited')::bool,false) visited
     from restaurants
     order by (editorial->>'verdict' is null) desc, name`
  );
  const visited = rows.filter((r) => r.visited).length;
  const pend = await pool.query("select ((select count(*) from photos where status='pending') + (select count(*) from tips where status='pending') + (select count(*) from reviews where status='pending') + (select count(*) from claims where status='pending') + (select count(*) from events where status='pending'))::int n");
  const pending = pend.rows[0].n as number;

  return (
    <main className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-3 mb-2">
        <h1 className="font-display font-black text-4xl text-ink">Newsroom</h1>
        <span className="font-stamp uppercase tracking-[0.1em] text-ink-soft text-sm">{rows.length} spots · {visited} visited</span>
      </div>
      <div className="flex justify-between items-center mb-6 font-ui text-xs text-ink-soft">
        <span>Signed in as {user.email}</span>
        <span className="flex items-center gap-4">
          <Link href="/admin/moderation" className={`font-stamp uppercase tracking-[0.08em] ${pending > 0 ? 'text-chile' : 'text-ink-soft'}`}>
            Moderation{pending > 0 ? ` (${pending})` : ''}
          </Link>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/admin' }); }}>
            <button className="text-chile font-stamp uppercase tracking-[0.08em]">Sign out</button>
          </form>
        </span>
      </div>
      <table className="w-full font-ui text-sm">
        <thead>
          <tr className="text-left border-b border-rule font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft">
            <th className="py-2">Spot</th><th>Verdict</th><th>Visited</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className="border-b border-rule/60">
              <td className="py-2">
                <span className="font-display font-semibold text-ink text-base">{r.name}</span>
                <span className="text-ink-soft text-xs ml-2">{r.cat}</span>
              </td>
              <td className="text-oxblood font-stamp uppercase tracking-[0.06em]">{r.verdict || 'none'}</td>
              <td>{r.visited ? '✓' : ''}</td>
              <td className="text-right"><Link href={`/admin/r/${r.slug}`} className="text-chile font-stamp uppercase tracking-[0.08em] hover:text-oxblood">Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
