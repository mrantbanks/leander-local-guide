'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveOwnerLogo } from '@/app/actions';
import Help from '@/components/Help';

/**
 * Upload a logo, see what the guide does to it, and choose.
 *
 * The model is offered, never imposed. It cleans backgrounds off well and it also, sometimes,
 * quietly redraws a letterform. A machine "improving" somebody's brand without asking is a thing an
 * owner would be right to be furious about, so both versions sit side by side and the original is
 * always one click away.
 */
type Result = { original: string; originalFile: string; cleaned: string | null; cleanedFile?: string; note?: string };

export default function LogoStudio({
  slug, name, current, headerPhoto,
}: {
  slug: string;
  name: string;
  /** Full URL of the logo currently live on their page, if any. */
  current: string | null;
  /** Their hero image, so the preview shows the real thing behind it. */
  headerPhoto: string | null;
}) {
  const router = useRouter();
  const [res, setRes] = useState<Result | null>(null);
  const [pick, setPick] = useState<'cleaned' | 'original'>('cleaned');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  const upload = async (file: File) => {
    setErr(''); setRes(null); setBusy(true);
    try {
      const fd = new FormData();
      fd.set('slug', slug);
      fd.set('logo', file);
      const r = await fetch('/api/owner/logo', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Upload failed');
      setRes(j);
      setPick(j.cleaned ? 'cleaned' : 'original');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!res) return;
    const file = pick === 'cleaned' && res.cleanedFile ? res.cleanedFile : res.originalFile;
    start(async () => {
      const r = await saveOwnerLogo(slug, file);
      if (!r.ok) { setErr(r.error || 'Could not save that'); return; }
      setRes(null);
      router.refresh();
    });
  };

  const remove = () =>
    start(async () => {
      await saveOwnerLogo(slug, null);
      router.refresh();
    });

  const chosen = res ? (pick === 'cleaned' && res.cleaned ? res.cleaned : res.original) : current;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink">Your logo</h2>
        <Help
          text="Drop your logo in and we knock the background out so it sits on the guide's paper instead of floating in a white box. You always see both versions and you pick. We never quietly replace your logo with a machine's idea of it."
          example="A photo of your sign works. So does a PNG, a JPEG, or something off your menu."
        />
      </div>
      <p className="font-ui text-sm text-ink-soft mb-4">
        It shows at the top of your page, next to your name. The guide is printed on paper, not glass, so a logo with a
        white box round it looks like a sticker. We take the box off.
      </p>

      {/* What is live right now */}
      {current && !res && (
        <div className="flex flex-wrap items-center gap-4 border border-rule bg-paper-raised rounded-sm p-4 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt={`${name} logo`} className="w-20 h-20 object-contain" />
          <div className="min-w-0">
            <p className="font-stamp uppercase tracking-[0.08em] text-xs text-chile">Live on your page now</p>
            <Link href={`/r/${slug}`} target="_blank" className="font-ui text-sm text-chile underline underline-offset-2">
              See it on your page →
            </Link>
          </div>
          <button
            onClick={remove}
            disabled={pending}
            className="ml-auto font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft hover:text-oxblood"
          >
            Take it off
          </button>
        </div>
      )}

      <label className="inline-block">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
        />
        <span className="inline-block cursor-pointer font-stamp uppercase tracking-[0.08em] text-sm border-2 border-ink text-ink px-4 py-2 rounded-sm hover:bg-ink hover:text-paper transition-colors">
          {busy ? 'Working on it...' : current ? 'Upload a different one' : 'Upload your logo'}
        </span>
      </label>

      {err && <p className="font-ui text-sm text-oxblood mt-2">{err}</p>}

      {/* Choose. Both versions, side by side, on the real paper colour. */}
      {res && (
        <div className="mt-5">
          <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-2">
            {res.cleaned ? 'Pick the one you want' : 'We could not clean this one up, so here is yours as it came'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {res.cleaned && (
              <button
                onClick={() => setPick('cleaned')}
                className={`border-2 rounded-sm p-4 text-left transition-colors ${pick === 'cleaned' ? 'border-chile bg-paper-raised' : 'border-rule hover:border-ink'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={res.cleaned} alt="Cleaned up" className="w-24 h-24 object-contain mx-auto" />
                <p className="font-stamp uppercase tracking-[0.08em] text-xs text-chile mt-3 text-center">Cleaned up</p>
                <p className="font-ui text-xs text-ink-soft text-center mt-0.5">Background off, sits on the paper</p>
              </button>
            )}
            <button
              onClick={() => setPick('original')}
              className={`border-2 rounded-sm p-4 text-left transition-colors ${pick === 'original' ? 'border-chile bg-paper-raised' : 'border-rule hover:border-ink'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={res.original} alt="As you sent it" className="w-24 h-24 object-contain mx-auto" />
              <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink mt-3 text-center">Exactly as you sent it</p>
              <p className="font-ui text-xs text-ink-soft text-center mt-0.5">Untouched. Nothing changed.</p>
            </button>
          </div>

          {res.note && <p className="font-ui text-xs text-ink-soft mt-2">({res.note})</p>}

          <button
            onClick={save}
            disabled={pending}
            className="mt-4 font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-5 py-2.5 rounded-sm hover:bg-oxblood disabled:opacity-50"
          >
            {pending ? 'Putting it up...' : 'Put this on my page'}
          </button>
        </div>
      )}

      {/* The preview: their actual page header, with the logo in it. */}
      {chosen && (
        <div className="mt-8">
          <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-2">
            This is how it looks at the top of your page
          </p>
          <div className="border-2 border-ink bg-paper overflow-hidden">
            {headerPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={headerPhoto} alt="" className="w-full h-28 object-cover border-b-2 border-ink" />
            )}
            <div className="p-5 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={chosen} alt="" className="w-16 h-16 object-contain shrink-0" />
              <div className="min-w-0">
                <p className="font-stamp uppercase tracking-[0.18em] text-chile text-xs">Restaurant · Local Owned</p>
                <p className="font-display font-black text-ink text-3xl leading-none tracking-[-0.02em] truncate">{name}</p>
              </div>
            </div>
          </div>
          <Link href={`/r/${slug}`} target="_blank" className="inline-block mt-3 font-stamp uppercase tracking-[0.08em] text-xs text-chile hover:text-oxblood">
            Open your real page in a new tab →
          </Link>
        </div>
      )}
    </div>
  );
}
