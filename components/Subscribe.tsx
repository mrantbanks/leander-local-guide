'use client';

import { useState } from 'react';
import Turnstile from './Turnstile';

export default function Subscribe({ source = 'site', siteKey, headline, sub, cta = "I'm in" }: {
  source?: string; siteKey?: string; headline?: string; sub?: string; cta?: string;
}) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'already' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending'); setMsg('');
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, turnstileToken: token }),
      });
      const j = await r.json();
      if (!r.ok) { setState('err'); setMsg(j.error || 'Something went wrong'); return; }
      setState(j.state === 'already' ? 'already' : 'done');
    } catch { setState('err'); setMsg('Network hiccup, try again'); }
  }

  if (state === 'done') return (
    <div className="border-2 border-chile bg-paper-raised p-5">
      <p className="font-display font-bold text-xl text-ink">Check your inbox, there&apos;s a door to open.</p>
      <p className="font-ui text-sm text-ink-soft mt-2 leading-relaxed">I sent a confirmation. Click the link from Anthony and you&apos;re in for real. (Not there in a minute? Peek in spam and drag me to your inbox.)</p>
    </div>
  );
  if (state === 'already') return (
    <div className="border border-rule bg-paper-raised p-5"><p className="font-ui text-sm text-ink">You&apos;re already on the list. Good taste.</p></div>
  );

  return (
    <div className="border-2 border-ink bg-paper-raised p-5">
      {headline && <h3 className="font-display font-black text-xl text-ink leading-snug">{headline}</h3>}
      {sub && <p className="font-ui text-sm text-ink-soft mt-1 mb-3 leading-relaxed">{sub}</p>}
      <form onSubmit={submit} className="flex flex-col gap-2">
        <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full bg-paper border border-rule px-3 py-2.5 font-ui text-base text-ink focus:border-chile outline-none" />
        {siteKey && <Turnstile siteKey={siteKey} onToken={setToken} />}
        <button type="submit" disabled={state === 'sending'}
          className="font-stamp uppercase tracking-[0.12em] text-base bg-chile text-paper px-5 py-2.5 hover:bg-oxblood transition-colors disabled:opacity-60">
          {state === 'sending' ? 'Sending...' : cta}
        </button>
        {state === 'err' && <p className="font-ui text-xs text-oxblood">{msg}</p>}
        <p className="font-ui text-sm text-ink-soft">Just your email, just the food. One click unsubscribes you for good.</p>
      </form>
    </div>
  );
}
