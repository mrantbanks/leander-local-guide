'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSeoOverrides } from '@/app/actions';
import { snippetChecks, TITLE_MAX, DESC_MAX, type SnippetCheck } from '@/lib/seo';
import type { SerpPage, JsonLdBlock, RichResult } from '@/lib/seo-inspect';
import SerpPreview from './SerpPreview';

type FieldKey = 'seoTitle' | 'seoDescription' | 'seoTitleMenu' | 'seoDescriptionMenu';
type FieldState = { on: boolean; value: string; auto: string };

// One lazily-built canvas for pixel measurement (Google truncates titles by pixels, not chars).
let measureCtx: CanvasRenderingContext2D | null | undefined;
function titlePixels(text: string): number | null {
  if (typeof document === 'undefined') return null;
  if (measureCtx === undefined) {
    measureCtx = document.createElement('canvas').getContext('2d');
    if (measureCtx) measureCtx.font = '20px arial';
  }
  return measureCtx ? Math.round(measureCtx.measureText(text).width) : null;
}

const titleField = (k: SerpPage['key']): FieldKey => (k === 'main' ? 'seoTitle' : 'seoTitleMenu');
const descField = (k: SerpPage['key']): FieldKey => (k === 'main' ? 'seoDescription' : 'seoDescriptionMenu');

const LEVEL: Record<SnippetCheck['level'], { c: string; bg: string; label: string }> = {
  error: { c: 'text-paper', bg: 'bg-oxblood', label: 'Fix' },
  warn: { c: 'text-ink', bg: 'bg-amber', label: 'Check' },
  info: { c: 'text-ink-soft', bg: 'bg-paper-sunk', label: 'FYI' },
};

function Checks({ items }: { items: { level: SnippetCheck['level']; msg: string }[] }) {
  if (!items.length) return <p className="font-ui text-xs text-ink-soft">No issues. This reads clean.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((c, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className={`font-stamp uppercase tracking-[0.06em] text-[10px] px-1.5 py-0.5 rounded-[2px] shrink-0 ${LEVEL[c.level].bg} ${LEVEL[c.level].c}`}>{LEVEL[c.level].label}</span>
          <span className="font-ui text-xs text-ink">{c.msg}</span>
        </li>
      ))}
    </ul>
  );
}

function Counter({ len, max }: { len: number; max: number }) {
  const soft = Math.round(max * 0.84);
  const state = len > max ? 'text-paper bg-oxblood' : len >= soft ? 'text-ink bg-amber' : 'text-ink-soft bg-paper-sunk';
  return <span className={`font-stamp uppercase tracking-[0.06em] text-[10px] px-1.5 py-0.5 rounded-[2px] ${state}`}>{len} / {max}</span>;
}

function RichBadge({ r }: { r: RichResult }) {
  const map = {
    eligible: 'bg-chile text-paper',
    'not-eligible': 'bg-paper-sunk text-ink-soft',
    info: 'border border-rule text-ink-soft',
  } as const;
  const label = { eligible: 'Eligible', 'not-eligible': 'Not eligible', info: 'Info' }[r.status];
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-rule last:border-0">
      <span className={`font-stamp uppercase tracking-[0.06em] text-[10px] px-1.5 py-0.5 rounded-[2px] shrink-0 ${map[r.status]}`}>{label}</span>
      <div>
        <p className="font-ui text-sm text-ink font-semibold leading-tight">{r.name}</p>
        <p className="font-ui text-xs text-ink-soft">{r.reason}</p>
      </div>
    </div>
  );
}

function JsonBlock({ b }: { b: JsonLdBlock }) {
  const [copied, setCopied] = useState(false);
  const pretty = JSON.stringify(b.raw, null, 2);
  return (
    <details className="border border-rule rounded-[2px] bg-paper">
      <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between gap-2 hover:bg-paper-raised">
        <span className="font-stamp uppercase tracking-[0.08em] text-xs text-chile">{b.label}</span>
        <span className="font-ui text-[10px] text-ink-soft">tap to expand</span>
      </summary>
      <div className="px-3 pb-3">
        <p className="font-ui text-xs text-ink-soft mb-2 border-l-2 border-chile pl-2">{b.plain}</p>
        <div className="relative">
          <button
            onClick={() => { navigator.clipboard.writeText(pretty); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
            className="absolute top-1 right-1 font-stamp uppercase tracking-[0.06em] text-[10px] bg-ink text-paper px-2 py-0.5 rounded-[2px] hover:bg-chile"
          >{copied ? 'Copied' : 'Copy'}</button>
          <pre className="overflow-x-auto text-[11px] leading-[1.5] bg-paper-sunk border border-rule rounded-[2px] p-2 text-ink"><code>{pretty}</code></pre>
        </div>
      </div>
    </details>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-1.5 border-b border-rule last:border-0">
      <dt className="font-stamp uppercase tracking-[0.08em] text-[11px] text-ink-soft sm:w-32 shrink-0">{label}</dt>
      <dd className="font-ui text-sm text-ink break-words min-w-0">{children}</dd>
    </div>
  );
}

export default function SeoInspector({ slug, name, hidden, pages }: { slug: string; name: string; hidden: boolean; pages: SerpPage[] }) {
  const router = useRouter();
  const [activeKey, setActiveKey] = useState<SerpPage['key']>(pages[0].key);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const init: Partial<Record<FieldKey, FieldState>> = {};
  for (const p of pages) {
    init[titleField(p.key)] = { on: p.titleOverride != null, value: p.titleOverride ?? p.titleAuto, auto: p.titleAuto };
    init[descField(p.key)] = { on: p.descriptionOverride != null, value: p.descriptionOverride ?? p.descriptionAuto, auto: p.descriptionAuto };
  }
  const [fields, setFields] = useState<Partial<Record<FieldKey, FieldState>>>(init);

  const dirty = useMemo(() => pages.some((p) => {
    const t = fields[titleField(p.key)]!; const d = fields[descField(p.key)]!;
    const tOver = t.on ? t.value : null; const dOver = d.on ? d.value : null;
    return tOver !== p.titleOverride || dOver !== p.descriptionOverride;
  }), [fields, pages]);

  const active = pages.find((p) => p.key === activeKey)!;
  const tf = fields[titleField(active.key)]!;
  const df = fields[descField(active.key)]!;
  const liveTitle = tf.on ? tf.value : tf.auto;
  const liveDesc = df.on ? df.value : df.auto;
  const liveChecks = snippetChecks(liveTitle, liveDesc);

  const titlePx = useMemo(() => titlePixels(liveTitle), [liveTitle]);

  const setField = (k: FieldKey, patch: Partial<FieldState>) => setFields((f) => ({ ...f, [k]: { ...f[k]!, ...patch } }));

  async function save() {
    setSaving(true); setFlash(null);
    const payload: { seoTitle?: string; seoDescription?: string; seoTitleMenu?: string; seoDescriptionMenu?: string } = {};
    (['seoTitle', 'seoDescription', 'seoTitleMenu', 'seoDescriptionMenu'] as FieldKey[]).forEach((k) => {
      const s = fields[k];
      if (s) payload[k] = s.on ? s.value : '';
    });
    const res = await saveSeoOverrides(slug, payload);
    setSaving(false);
    if (res.ok) { setFlash('Saved. Live in a moment.'); router.refresh(); }
    else setFlash(res.error || 'Could not save.');
  }

  const editor = (fk: FieldKey, kind: 'title' | 'description') => {
    const st = fields[fk]!;
    const max = kind === 'title' ? TITLE_MAX : DESC_MAX;
    const live = st.on ? st.value : st.auto;
    return (
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft">{kind === 'title' ? 'Title' : 'Meta description'}</span>
          <div className="flex items-center gap-2">
            <Counter len={live.length} max={max} />
            {kind === 'title' && titlePx != null && <span className="font-ui text-[10px] text-ink-soft">~{titlePx}px</span>}
            <span className={`font-stamp uppercase tracking-[0.06em] text-[10px] px-1.5 py-0.5 rounded-[2px] ${st.on ? 'bg-chile text-paper' : 'bg-paper-sunk text-ink-soft'}`}>{st.on ? 'Override' : 'Auto'}</span>
          </div>
        </div>
        {kind === 'title' ? (
          <input
            value={live} disabled={!st.on}
            onChange={(e) => setField(fk, { value: e.target.value })}
            className={`w-full border border-rule px-3 py-2 font-ui text-sm text-ink rounded-[2px] ${st.on ? 'bg-paper' : 'bg-paper-sunk text-ink-soft'}`}
          />
        ) : (
          <textarea
            value={live} disabled={!st.on} rows={3}
            onChange={(e) => setField(fk, { value: e.target.value })}
            className={`w-full border border-rule px-3 py-2 font-ui text-sm text-ink rounded-[2px] resize-y ${st.on ? 'bg-paper' : 'bg-paper-sunk text-ink-soft'}`}
          />
        )}
        <div className="mt-1 flex items-center gap-3">
          {!st.on ? (
            <button onClick={() => setField(fk, { on: true })} className="font-stamp uppercase tracking-[0.06em] text-[11px] text-chile hover:text-oxblood">Override this</button>
          ) : (
            <button onClick={() => setField(fk, { on: false, value: st.auto })} className="font-stamp uppercase tracking-[0.06em] text-[11px] text-ink-soft hover:text-chile">Reset to auto</button>
          )}
          {st.on && st.value !== st.auto && <span className="font-ui text-[11px] text-ink-soft truncate">auto: {st.auto}</span>}
        </div>
      </div>
    );
  };

  const rrt = `https://search.google.com/test/rich-results?url=${encodeURIComponent(active.url)}`;
  const smv = `https://validator.schema.org/#url=${encodeURIComponent(active.url)}`;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h1 className="font-display font-black text-2xl text-ink">SEO Desk · {name}</h1>
        <div className="flex items-center gap-3">
          <a href={`/admin/r/${slug}`} className="font-stamp uppercase tracking-[0.08em] text-xs text-chile hover:text-oxblood">Full editor →</a>
          <a href={active.url} target="_blank" rel="noreferrer" className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft hover:text-chile">Open live ↗</a>
        </div>
      </div>
      <p className="font-ui text-sm text-ink-soft mb-4">Exactly what Google sees for each of this spot&apos;s pages, built from the same code the page ships. Edit the search title and description; everything else is read from the live markup.</p>

      {hidden && <div className="mb-4 border-l-4 border-oxblood bg-paper-sunk px-3 py-2 font-ui text-sm text-ink">This spot is hidden. Its public pages return 404, so Google will not index them right now.</div>}

      {/* Page tabs */}
      {pages.length > 1 && (
        <div className="flex gap-1 mb-4 border-b border-rule">
          {pages.map((p) => (
            <button key={p.key} onClick={() => setActiveKey(p.key)}
              className={`font-stamp uppercase tracking-[0.08em] text-xs px-4 py-2 -mb-px border-b-2 ${activeKey === p.key ? 'border-chile text-chile' : 'border-transparent text-ink-soft hover:text-ink'}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* SERP PREVIEW — the headline: what a user sees on Google */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-chile">On Google</h2>
          <div className="flex rounded-[2px] overflow-hidden border border-rule">
            {(['desktop', 'mobile'] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)}
                className={`font-stamp uppercase tracking-[0.06em] text-[11px] px-3 py-1 ${device === d ? 'bg-ink text-paper' : 'bg-paper text-ink-soft hover:text-ink'}`}>{d}</button>
            ))}
          </div>
        </div>
        <div className="bg-paper-sunk border border-rule rounded-[2px] p-4 flex justify-center">
          <SerpPreview
            device={device}
            siteName={active.siteName}
            breadcrumb={active.breadcrumb}
            title={liveTitle}
            description={liveDesc}
            rating={active.rating.eligible && active.rating.value != null ? { value: active.rating.value, count: active.rating.count } : null}
          />
        </div>
        <p className="font-ui text-xs text-ink-soft mt-2">
          Google rewrites the description for most searches, and sometimes the title too, so treat this as the best case. {active.rating.eligible ? '' : 'No stars show until three locals review this spot, which is the normal state for most pages.'}
        </p>
      </section>

      {/* EDITOR */}
      <section className="mb-6 bg-paper-raised border border-rule rounded-[2px] p-4">
        <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-chile mb-3">Edit the {active.label.toLowerCase()} snippet</h2>
        <div className="space-y-4">
          {editor(titleField(active.key), 'title')}
          {editor(descField(active.key), 'description')}
        </div>
        <div className="mt-4 pt-3 border-t border-rule">
          <h3 className="font-stamp uppercase tracking-[0.1em] text-[11px] text-ink-soft mb-2">Snippet checks</h3>
          <Checks items={liveChecks} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={save} disabled={saving || !dirty}
            className={`font-stamp uppercase tracking-[0.08em] text-xs px-4 py-2 rounded-[2px] ${dirty && !saving ? 'bg-chile text-paper hover:bg-oxblood' : 'bg-paper-sunk text-ink-soft cursor-not-allowed'}`}>
            {saving ? 'Saving…' : dirty ? 'Save overrides' : 'Saved'}
          </button>
          {flash && <span className="font-ui text-sm text-ink-soft">{flash}</span>}
        </div>
      </section>

      {/* INDEXABILITY */}
      <section className="mb-6">
        <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-chile mb-2">What Google reads</h2>
        <dl className="bg-paper border border-rule rounded-[2px] px-4 py-2">
          <Row label="URL"><a href={active.url} target="_blank" rel="noreferrer" className="text-chile underline underline-offset-2 break-all">{active.url}</a></Row>
          <Row label="Canonical"><span className={active.canonical === active.url ? '' : 'text-oxblood'}>{active.canonical}</span> {active.canonical === active.url && <span className="text-ink-soft text-xs">(self, good)</span>}</Row>
          <Row label="Robots">{active.robots}</Row>
          <Row label="In sitemap">{active.inSitemap ? <span className="text-ink">Yes</span> : <span className="text-oxblood">No</span>}</Row>
          <Row label="robots.txt">{active.robotsTxtAllowed ? <span className="text-ink">Allowed</span> : <span className="text-oxblood">Blocked</span>}</Row>
          <Row label="H1">{active.h1}</Row>
          <Row label="OG title">{active.og.title}</Row>
          <Row label="OG description">{active.og.description}</Row>
          <Row label="OG image">{active.og.image ? <a href={active.og.image} target="_blank" rel="noreferrer" className="text-chile underline underline-offset-2 break-all">{active.og.image}</a> : <span className="text-amber">none (blank social card)</span>}</Row>
          {active.twitter && <Row label="Twitter card">{active.twitter.card}</Row>}
        </dl>
      </section>

      {/* RICH RESULTS */}
      <section className="mb-6">
        <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-chile mb-2">Rich results this page can earn</h2>
        <div className="bg-paper border border-rule rounded-[2px] px-4 py-1">
          {active.richResults.map((r, i) => <RichBadge key={i} r={r} />)}
        </div>
      </section>

      {/* STRUCTURED DATA */}
      <section className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-chile">Structured data (JSON-LD)</h2>
          <div className="flex items-center gap-3">
            <a href={rrt} target="_blank" rel="noreferrer" className="font-stamp uppercase tracking-[0.06em] text-[11px] text-chile hover:text-oxblood">Rich Results Test ↗</a>
            <a href={smv} target="_blank" rel="noreferrer" className="font-stamp uppercase tracking-[0.06em] text-[11px] text-chile hover:text-oxblood">Schema Validator ↗</a>
          </div>
        </div>
        <div className="space-y-2">
          {active.jsonLd.map((b, i) => <JsonBlock key={i} b={b} />)}
        </div>
      </section>

      {/* PAGE LINTS */}
      {(active.page.length > 0 || active.duplicates.length > 0) && (
        <section className="mb-10">
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-chile mb-2">Page checks</h2>
          <div className="bg-paper border border-rule rounded-[2px] p-4 space-y-2">
            <Checks items={active.page} />
            {active.duplicates.length > 0 && (
              <div className="pt-2 border-t border-rule">
                <p className="font-stamp uppercase tracking-[0.08em] text-[11px] text-ink-soft mb-1">Same {active.duplicates[0].field} as</p>
                <ul className="font-ui text-xs text-ink space-y-0.5">
                  {active.duplicates.map((d, i) => (
                    <li key={i}><a href={`/admin/seo/r/${d.slug}`} className="text-chile underline underline-offset-2">{d.name}</a> <span className="text-ink-soft">({d.page} · {d.field})</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
