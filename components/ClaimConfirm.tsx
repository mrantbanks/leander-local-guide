'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { claimRestaurant } from '@/app/actions';

export default function ClaimConfirm({ tokenId, name, email }: { tokenId: number; name: string; email: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();

  async function go() {
    setBusy(true); setErr('');
    try {
      const r = await claimRestaurant(tokenId);
      if (r.ok && r.slug) router.push(`/owner/${r.slug}?welcome=1`);
      else { setErr(r.reason || 'Could not claim this listing.'); setBusy(false); }
    } catch { setErr('Something went wrong. Try again.'); setBusy(false); }
  }

  return (
    <div className="text-center">
      <p className="font-ui text-sm text-ink-soft mb-1">Signed in as {email}</p>
      <button onClick={go} disabled={busy}
        className="font-stamp uppercase tracking-[0.1em] text-base bg-chile text-paper px-6 py-3 rounded-sm hover:bg-oxblood disabled:opacity-60">
        {busy ? 'Claiming...' : `Yes — I manage ${name}`}
      </button>
      {err && <p className="font-ui text-sm text-oxblood mt-3">{err}</p>}
      <p className="font-ui text-xs text-ink-soft mt-4">This becomes your login. Once claimed, this code stops working.</p>
    </div>
  );
}
