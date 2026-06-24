'use client';

import { useSession, signIn } from 'next-auth/react';
import TipForm from '@/components/TipForm';

export default function TipContribute({ slug, siteKey }: { slug: string; siteKey: string }) {
  const { status } = useSession();
  if (status === 'authenticated') return <TipForm slug={slug} siteKey={siteKey} />;
  if (status === 'unauthenticated') {
    return (
      <button onClick={() => signIn('google', { callbackUrl: `/r/${slug}` })} className="font-stamp uppercase tracking-[0.08em] text-sm text-chile hover:text-oxblood">
        Sign in to leave a tip →
      </button>
    );
  }
  return null;
}
