'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveMenu, deleteMenu } from '@/app/actions';
import type { MenuData } from '@/lib/spots';

// Admin studio for the structured menu behind /r/<slug>/menu.
// Flow: mark menu photos 📋 in the photo grid -> Extract with AI -> tweak the JSON -> Save.
export default function MenuStudio({ slug, initial, menuPhotoCount }: { slug: string; initial: MenuData | null; menuPhotoCount: number }) {
  const [menu, setMenu] = useState<MenuData | null>(initial);
  const [json, setJson] = useState(initial ? JSON.stringify(initial, null, 2) : '');
  const [showJson, setShowJson] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState('');
  const router = useRouter();

  const itemCount = (m: MenuData | null) => (m?.sections || []).reduce((a, s) => a + s.items.length, 0);

  async function extract() {
    setBusy('extract'); setErr('');
    try {
      const r = await fetch('/api/admin/menu-extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) });
      const j = await r.json().catch(() => ({}));
      if (j.menu) {
        setMenu(j.menu); setJson(JSON.stringify(j.menu, null, 2));
        setFlash(`✓ Read ${itemCount(j.menu)} dishes from ${j.photoCount} photo${j.photoCount !== 1 ? 's' : ''} — it's live; proof-read below`);
        setTimeout(() => setFlash(''), 6000);
        router.refresh();
      } else setErr(j.error || `Extraction failed (${r.status})`);
    } catch (e) { setErr((e as Error).message); }
    setBusy('');
  }

  async function save() {
    setBusy('save'); setErr('');
    const res = await saveMenu(slug, json);
    if (res.ok) {
      try { setMenu(JSON.parse(json)); } catch { /* validated server-side */ }
      setFlash('✓ Menu saved and live'); setTimeout(() => setFlash(''), 3000);
      router.refresh();
    } else setErr(res.error || 'Save failed');
    setBusy('');
  }

  async function del() {
    if (!confirm('Remove the structured menu? The /menu page will 404 until you extract or save again.')) return;
    setBusy('del'); await deleteMenu(slug); setMenu(null); setJson(''); setBusy(''); router.refresh();
  }

  const btn = 'font-stamp uppercase tracking-[0.08em] text-xs px-3 py-2 rounded-sm disabled:opacity-50';
  return (
    <div className="border border-rule rounded-sm p-4 bg-paper-raised">
      {menu ? (
        <p className="font-ui text-sm text-ink mb-1">
          <b>{menu.sections.length}</b> sections · <b>{itemCount(menu)}</b> dishes
          {menu.extracted ? <span className="text-ink-soft"> · extracted {menu.extracted}</span> : null}
          {' · '}
          <a href={`/r/${slug}/menu`} target="_blank" rel="noopener" className="text-chile underline underline-offset-2">view the live menu page ↗</a>
        </p>
      ) : (
        <p className="font-ui text-sm text-ink-soft mb-1">
          No structured menu yet. {menuPhotoCount > 0
            ? `${menuPhotoCount} photo${menuPhotoCount !== 1 ? 's are' : ' is'} marked 📋 Menu — extract to build the SEO menu page.`
            : 'First mark the menu photo(s) with 📋 in the photo grid above, then extract.'}
        </p>
      )}
      <p className="font-ui text-xs text-ink-soft mb-3">The extracted menu gets its own Google-indexable page at <span className="text-ink">/r/{slug}/menu</span>: every dish and price as real text plus Menu structured data. People search &quot;{'<'}restaurant{'>'} menu&quot; constantly; the photos alone are invisible to them.</p>

      <div className="flex flex-wrap gap-2">
        <button onClick={extract} disabled={!!busy || menuPhotoCount === 0} className={`${btn} bg-chile text-paper hover:bg-oxblood`}>
          {busy === 'extract' ? '✨ Reading the menu (10-30s)...' : menu ? '✨ Re-extract from photos' : '✨ Extract menu from photos'}
        </button>
        {(menu || json) && (
          <button onClick={() => setShowJson((v) => !v)} className={`${btn} border border-ink text-ink hover:bg-ink hover:text-paper`}>
            {showJson ? 'Hide editor' : '✎ Edit the data'}
          </button>
        )}
        {menu && <button onClick={del} disabled={!!busy} className={`${btn} border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper`}>Remove menu</button>}
      </div>

      {flash && <p className="font-stamp uppercase tracking-[0.08em] text-xs text-chile mt-2">{flash}</p>}
      {err && <p className="font-ui text-xs text-oxblood mt-2">{err}</p>}

      {showJson && (
        <div className="mt-3">
          <textarea value={json} onChange={(e) => setJson(e.target.value)} rows={16} spellCheck={false}
            className="w-full bg-paper border border-rule px-3 py-2 font-mono text-xs text-ink rounded-[2px] outline-none focus:border-chile"
            placeholder='{"sections":[{"name":"Appetizers","items":[{"name":"Egg Roll","price":"2"}]}]}' />
          <div className="flex items-center gap-3 mt-1.5">
            <button onClick={save} disabled={!!busy || !json.trim()} className={`${btn} bg-ink text-paper hover:bg-chile`}>{busy === 'save' ? 'Saving...' : 'Save menu'}</button>
            <span className="font-ui text-sm text-ink-soft">Shape: sections → items → name / desc / price (price as printed, no $). A section &quot;note&quot; covers shared pricing like proteins or sizes.</span>
          </div>
        </div>
      )}
    </div>
  );
}
