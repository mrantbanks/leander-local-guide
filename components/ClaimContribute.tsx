'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import ClaimForm from '@/components/ClaimForm';

export default function ClaimContribute({ slug, siteKey }: { slug: string; siteKey: string }) {
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

  if (status === 'authenticated' && !isOwner) {
    return (
      <div className="mt-6">
        <ClaimForm slug={slug} siteKey={siteKey} />
      </div>
    );
  }
  return null;
}
