'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import ReviewForm from '@/components/ReviewForm';
import OwnerResponseForm from '@/components/OwnerResponseForm';

export default function ReviewContribute({ slug, siteKey }: { slug: string; siteKey: string }) {
  const { status } = useSession();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let live = true;
    fetch(`/api/owner-status?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => { if (live) setIsOwner(!!d.isOwner); })
      .catch(() => {});
    return () => { live = false; };
  }, [status, slug]);

  if (status === 'authenticated') {
    return isOwner ? (
      <div>
        <p className="font-stamp uppercase tracking-[0.1em] text-xs text-chile mb-2">You manage this listing. Respond as the owner:</p>
        <OwnerResponseForm slug={slug} siteKey={siteKey} />
      </div>
    ) : (
      <ReviewForm slug={slug} siteKey={siteKey} />
    );
  }
  if (status === 'unauthenticated') {
    return (
      <button onClick={() => signIn('google', { callbackUrl: `/r/${slug}` })} className="font-stamp uppercase tracking-[0.08em] text-sm text-chile hover:text-oxblood">
        Sign in to leave a review →
      </button>
    );
  }
  return null;
}
