'use client';

import { useState } from 'react';
import Turnstile from '@/components/Turnstile';

export default function ClaimForm({ slug, siteKey }: { slug: string; siteKey: string }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('Owner');
  const [contact, setContact] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!contact.trim() || !token) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('slug', slug);
    fd.append('role', role);
    fd.append('contact', contact);
    fd.append('turnstileToken', token);
    const r = await fetch('/contribute/claim', { method: 'POST', body: fd });
    setBusy(false);
    if (r.ok) setDone(true);
    else { const e = await r.json().catch(() => ({})); alert(e.error || 'Failed'); }
  }

  if (done) return <p className="font-ui text-sm text-ink-soft">Claim submitted. We&apos;ll verify and get you set up. Claiming never affects rankings.</p>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft hover:text-chile">Own this spot? Claim it →</button>;

  return (
    <div className="mt-2 border border-rule bg-paper-raised p-4 max-w-md">
      <p className="font-ui text-xs text-ink-soft mb-3">Claim this listing to respond to reviews. We verify by hand. <span className="text-ink">Claiming never buys ranking.</span></p>
      <label className="block font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft mb-1">Your role</label>
      <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-paper border border-rule px-2 py-1 font-ui text-sm mb-3">
        {['Owner', 'Manager', 'Staff', 'Other'].map((r) => <option key={r}>{r}</option>)}
      </select>
      <label className="block font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft mb-1">Contact (business phone or email)</label>
      <input value={contact} onChange={(e) => setContact(e.target.value)} className="w-full bg-paper border border-rule px-2 py-1 font-ui text-sm mb-2" />
      <Turnstile siteKey={siteKey} onToken={setToken} />
      <button type="button" onClick={submit} disabled={busy || !contact.trim() || !token} className="font-stamp uppercase tracking-[0.1em] text-sm bg-ink text-paper px-4 py-2 hover:bg-chile disabled:opacity-50 transition-colors">
        {busy ? 'Sending…' : 'Submit claim'}
      </button>
    </div>
  );
}
