'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Turnstile from '@/components/Turnstile';

export default function ReviewForm({ slug, siteKey }: { slug: string; siteKey: string }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function submit() {
    if (!stars || !token) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('slug', slug);
    fd.append('stars', String(stars));
    fd.append('body', body);
    fd.append('turnstileToken', token);
    const r = await fetch('/contribute/review', { method: 'POST', body: fd });
    setBusy(false);
    if (r.ok) { setDone(true); router.refresh(); }
    else { const e = await r.json().catch(() => ({})); alert(e.error || 'Failed'); }
  }

  if (done) return <p className="font-hand text-xl text-oxblood">Thanks for the review. Anthony will give it a look and post it.</p>;

  return (
    <div>
      <div className="flex gap-1 mb-2" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onMouseEnter={() => setHover(n)} onClick={() => setStars(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={`text-2xl leading-none ${(hover || stars) >= n ? 'text-amber' : 'text-rule'}`}>★</button>
        ))}
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1200} rows={3} placeholder="How was it? (optional)" className="w-full bg-paper border border-rule px-3 py-2 font-ui text-sm rounded-[2px]" />
      <Turnstile siteKey={siteKey} onToken={setToken} />
      <button type="button" onClick={submit} disabled={busy || !stars || !token} className="font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-5 py-2 hover:bg-oxblood disabled:opacity-50 transition-colors">
        {busy ? 'Sending…' : 'Post review'}
      </button>
    </div>
  );
}
