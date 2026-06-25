import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { ownedPlaces } from '@/lib/owner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Owner desk', robots: { index: false } };

export default async function OwnerHome() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-5">
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/owner' }); }} className="text-center">
          <h1 className="font-display font-black text-2xl text-ink mb-3">Owner sign in</h1>
          <button className="font-stamp uppercase tracking-[0.1em] text-sm bg-ink text-paper px-6 py-3 rounded-sm">Sign in with Google</button>
        </form>
      </main>
    );
  }

  const places = await ownedPlaces(email);
  if (places.length === 1) redirect(`/owner/${places[0].slug}`);

  return (
    <main className="max-w-md mx-auto px-5 py-10">
      <h1 className="font-display font-black text-2xl text-ink mb-4">Your listings</h1>
      {places.length === 0 ? (
        <p className="font-ui text-sm text-ink-soft">No claimed listings on {email}. Got a printed sheet? Claim it at <Link href="/claim" className="text-chile underline">/claim</Link>.</p>
      ) : (
        <ul className="space-y-2">
          {places.map((p) => (
            <li key={p.slug}><Link href={`/owner/${p.slug}`} className="block bg-paper-raised border border-rule rounded-sm p-4 font-display font-bold text-lg text-ink hover:border-ink">{p.name} →</Link></li>
          ))}
        </ul>
      )}
    </main>
  );
}
