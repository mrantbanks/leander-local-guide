'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Turnstile from '@/components/Turnstile';

export default function OwnerResponseForm({ slug, siteKey }: { slug: string; siteKey: string }) {
  const [body, setBody] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function submit() {
    if (body.trim().length < 4 || !token) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('slug', slug);
    fd.append('body', body);
    fd.append('turnstileToken', token);
    const r = await fetch('/contribute/owner-response', { method: 'POST', body: fd });
    setBusy(false);
    if (r.ok) { setBody(''); setDone(true); router.refresh(); }
    else { const e = await r.json().catch(() => ({})); alert(e.error || 'Failed'); }
  }

  if (done) return <p className="font-hand text-xl text-oxblood">Posted. Thanks for chiming in.</p>;

  return (
    <div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} placeholder="Respond as the owner…" className="w-full bg-paper border border-rule px-3 py-2 font-ui text-sm rounded-[2px]" />
      <Turnstile siteKey={siteKey} onToken={setToken} />
      <button type="button" onClick={submit} disabled={busy || body.trim().length < 4 || !token} className="font-stamp uppercase tracking-[0.1em] text-sm bg-ink text-paper px-5 py-2 hover:bg-chile disabled:opacity-50 transition-colors">
        {busy ? 'Sending…' : 'Post response'}
      </button>
    </div>
  );
}
