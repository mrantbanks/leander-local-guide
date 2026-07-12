import type { ReactNode } from 'react';
import Link from 'next/link';
import { auth, signIn } from '@/auth';
import { getSpotAny, isVerifiedOwner } from '@/lib/spots';
import OwnerSidebar from '@/components/OwnerSidebar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Owner desk', robots: { index: false } };

// The gate lives here so every section inherits it, and so the sign-in screen renders WITHOUT the
// sidebar (a nav to pages you cannot open is just a wall of dead ends).
//
// Each page under here re-checks ownership anyway. A layout is a rendering wrapper, not a security
// boundary, and the pages fetch the owner's own data.
export default async function OwnerLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-5">
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: `/owner/${slug}` }); }} className="text-center">
          <h1 className="font-display font-black text-2xl text-ink mb-3">Sign in to manage your listing</h1>
          <button className="font-stamp uppercase tracking-[0.1em] text-sm bg-ink text-paper px-6 py-3 rounded-sm">Sign in with Google</button>
        </form>
      </main>
    );
  }

  const isAdmin = !!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  if (!isAdmin && !(await isVerifiedOwner(slug, email))) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-5 text-center">
        <div>
          <h1 className="font-display font-black text-2xl text-ink">This isn&apos;t your listing yet.</h1>
          <p className="font-ui text-sm text-ink-soft mt-2">
            Signed in as {email}. If you own this spot, claim it with the code on your printed sheet at{' '}
            <Link href="/claim" className="text-chile underline">/claim</Link>.
          </p>
        </div>
      </main>
    );
  }

  const spot = await getSpotAny(slug);
  if (!spot) return <main className="p-10 text-center font-ui">Listing not found.</main>;

  return (
    <main className="max-w-5xl mx-auto px-5 py-6 pb-24 sm:flex sm:gap-8">
      <OwnerSidebar slug={slug} name={spot.name} />
      <div className="flex-1 min-w-0">{children}</div>
    </main>
  );
}
