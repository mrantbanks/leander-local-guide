'use client';

import { useSession, signIn } from 'next-auth/react';
import UserPhotoUploader from '@/components/UserPhotoUploader';

export default function PhotoContribute({ slug, siteKey }: { slug: string; siteKey: string }) {
  const { status } = useSession();
  if (status === 'authenticated') return <UserPhotoUploader slug={slug} siteKey={siteKey} />;
  if (status === 'unauthenticated') {
    return (
      <button onClick={() => signIn('google', { callbackUrl: `/r/${slug}` })} className="font-stamp uppercase tracking-[0.08em] text-sm text-chile hover:text-oxblood">
        Sign in with Google to add photos →
      </button>
    );
  }
  return null;
}
