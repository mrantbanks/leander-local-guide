'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Turnstile from '@/components/Turnstile';
import { TRAIT_GROUPS } from '@/lib/traits';

/**
 * One flow. Stars, your take, the chips, and the practical note.
 *
 * The page used to have TWO free-text boxes stacked on top of each other, "post a tip" and "post a
 * review", asking the same person for the same thing. Two forms is two moments of goodwill, and you
 * only get one. There are four reviews on the entire site.
 *
 * The chips are the interesting part. They are the things Google STRUCTURALLY cannot tell you: Google
 * will say a place has a free lot, it will never say the lot is a nightmare at 7pm on a Friday, or
 * that you cannot hear the person opposite you. And because they are a bounded choice they need no
 * moderation, they aggregate into a real answer ("9 of 12 locals say it is quiet enough to talk"),
 * and they take a second to tap. Free text does none of those three things.
 */
const chip = 'font-stamp uppercase tracking-[0.06em] text-xs px-2.5 py-1.5 rounded-sm border transition-colors';
const on = 'bg-chile text-paper border-chile';
const off = 'border-rule text-ink-soft hover:border-ink hover:text-ink';

export default function ReviewForm({ slug, siteKey }: { slug: string; siteKey: string }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [tip, setTip] = useState('');
  const [traits, setTraits] = useState<string[]>([]);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const router = useRouter();

  // Exclusive groups: you cannot be both quiet and loud, so picking one clears its siblings.
  const pick = (groupKey: string, key: string, exclusive: boolean) =>
    setTraits((cur) => {
      if (cur.includes(key)) return cur.filter((k) => k !== key);
      const group = TRAIT_GROUPS.find((g) => g.key === groupKey)!;
      const siblings = exclusive ? group.traits.map((t) => t.key) : [];
      return [...cur.filter((k) => !siblings.includes(k)), key];
    });

  async function submit() {
    if (!stars || !token) return;
    setBusy(true);
    setErr('');
    const fd = new FormData();
    fd.append('slug', slug);
    fd.append('stars', String(stars));
    fd.append('body', body);
    fd.append('tip', tip);
    fd.append('traits', traits.join(','));
    fd.append('turnstileToken', token);
    const r = await fetch('/contribute/review', { method: 'POST', body: fd });
    setBusy(false);
    if (r.ok) { setDone(true); router.refresh(); return; }
    const e = await r.json().catch(() => ({}));
    setErr(e.error || 'That did not go through. Try again?');
  }

  if (done) {
    return (
      <p className="font-hand text-2xl text-oxblood">
        Thanks. Anthony gives every one a look before it goes up.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stars */}
      <div>
        <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1.5">Your call</p>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onClick={() => setStars(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              className={`text-3xl leading-none transition-colors ${(hover || stars) >= n ? 'text-amber' : 'text-rule'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* The take */}
      <div>
        <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1.5">How was it? (optional)</p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1200}
          rows={3}
          placeholder="What you ate, whether you would go back."
          className="w-full bg-paper border border-rule px-3 py-2 font-ui text-[16px] sm:text-sm text-ink rounded-sm outline-none focus:border-chile"
        />
      </div>

      {/* The chips. The bit Google cannot do. */}
      <div>
        <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1">
          Tap anything that fits (optional)
        </p>
        <p className="font-ui text-xs text-ink-soft/80 mb-2.5">
          Google can tell you they have a car park. Only you can tell people it is a nightmare at seven on a Friday.
        </p>
        <div className="space-y-2.5">
          {TRAIT_GROUPS.map((g) => (
            <div key={g.key}>
              <p className="font-ui text-xs text-ink-soft/70 mb-1">{g.question}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.traits.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => pick(g.key, t.key, g.exclusive)}
                    className={`${chip} ${traits.includes(t.key) ? on : off}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The practical note. This IS the old tip form, folded in where it belongs. */}
      <div>
        <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1.5">
          Anything practical worth knowing? (optional)
        </p>
        <input
          value={tip}
          onChange={(e) => setTip(e.target.value)}
          maxLength={200}
          placeholder="e.g. cash only after 8pm, park round the back"
          className="w-full bg-paper border border-rule px-3 py-2 font-ui text-[16px] sm:text-sm text-ink rounded-sm outline-none focus:border-chile"
        />
      </div>

      <Turnstile siteKey={siteKey} onToken={setToken} />

      {err && <p className="font-ui text-sm text-oxblood">{err}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={busy || !stars || !token}
        className="font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-5 py-2.5 rounded-sm hover:bg-oxblood disabled:opacity-50 transition-colors"
      >
        {busy ? 'Sending...' : 'Weigh in'}
      </button>
      {!stars && <p className="font-ui text-xs text-ink-soft">Pick a star rating to post.</p>}
    </div>
  );
}
