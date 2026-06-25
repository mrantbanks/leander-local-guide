'use client';

import { useState, useRef } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
// Bake a rotation (deg) and/or flip into a fresh dataURL so the displayed image is always WYSIWYG.
async function rotateFlip(src: string, deg: number, flipH: boolean, flipV: boolean): Promise<string> {
  const img = await loadImg(src);
  const swap = Math.abs(deg) % 180 !== 0;
  const w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = swap ? h : w; cv.height = swap ? w : h;
  const ctx = cv.getContext('2d')!;
  ctx.translate(cv.width / 2, cv.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -w / 2, -h / 2);
  return cv.toDataURL('image/png');
}

export default function PhotoEditor({ slug, src, photoId, onSaved, onClose }: { slug: string; src: string; photoId?: number; onSaved: (saved: { id: number; filename: string; replaced: boolean }) => void; onClose: () => void }) {
  const [work, setWork] = useState(src);
  const [crop, setCrop] = useState<Crop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [bright, setBright] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);

  const filter = `brightness(${bright}%) contrast(${contrast}%) saturate(${saturate}%)`;

  function hasPending(): boolean { return !!(crop && crop.width && crop.height) || bright !== 100 || contrast !== 100 || saturate !== 100; }
  function resetEdits() { setCrop(undefined); setBright(100); setContrast(100); setSaturate(100); }

  // Bake the pending crop + color into a fresh image so edits stack (crop -> AI -> rotate -> save).
  async function bakeCurrent(): Promise<string> {
    const img = imgRef.current;
    if (!img || !hasPending()) return work;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    let sx = 0, sy = 0, sw = nw, sh = nh;
    if (crop && crop.width && crop.height) {
      if (crop.unit === '%') { sx = (crop.x / 100) * nw; sy = (crop.y / 100) * nh; sw = (crop.width / 100) * nw; sh = (crop.height / 100) * nh; }
      else { const rx = nw / img.width, ry = nh / img.height; sx = crop.x * rx; sy = crop.y * ry; sw = crop.width * rx; sh = crop.height * ry; }
    }
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(sw)); cv.height = Math.max(1, Math.round(sh));
    const ctx = cv.getContext('2d')!; ctx.filter = filter;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.95);
  }
  async function applyEdits() { if (!hasPending()) return; setBusy('t'); const d = await bakeCurrent(); resetEdits(); setWork(d); setBusy(''); }
  async function doRotate(dir: 1 | -1) { setBusy('t'); const base = await bakeCurrent(); resetEdits(); setWork(await rotateFlip(base, dir * 90, false, false)); setBusy(''); }
  async function doFlip() { setBusy('t'); const base = await bakeCurrent(); resetEdits(); setWork(await rotateFlip(base, 0, true, false)); setBusy(''); }

  // Re-encode the current image to JPEG via canvas so Gemini always gets a format it edits cleanly.
  async function toBase64(s: string): Promise<{ data: string; mime: string }> {
    const img = await loadImg(s);
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.getContext('2d')!.drawImage(img, 0, 0);
    const url = cv.toDataURL('image/jpeg', 0.95);
    return { data: url.split(',')[1], mime: 'image/jpeg' };
  }

  const ENHANCE = 'Enhance this food/restaurant photo: improve the lighting, white balance, color, and sharpness so the food and space look appetizing and professionally shot. Do NOT change the composition or crop, and do not add or remove any objects. Keep it realistic.';
  const MENU_FIX = 'This is a photo of a printed restaurant menu. Turn it into a clean, flat, legible scan: correct the perspective and any slant or tilt so the menu is perfectly straight and rectangular, remove all glare, shadows, and reflections, remove the background and replace it with clean solid white, boost contrast and sharpness so every word is crisp, and center and straighten it. CRITICAL: keep ALL text exactly as it appears, do not change, add, or remove any words, prices, dishes, or numbers. Output a high-contrast straight-on image of just the menu, like a flatbed scan.';

  async function runGemini(p: string, clearPrompt = false) {
    if (!p.trim()) return;
    setBusy('ai'); setErr('');
    try {
      const base = await bakeCurrent();
      const { data, mime } = await toBase64(base);
      const r = await fetch('/api/admin/gemini-edit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: data, mimeType: mime, prompt: p }) });
      const j = await r.json().catch(() => ({}));
      if (j.image) { resetEdits(); setWork(`data:${j.mimeType};base64,${j.image}`); if (clearPrompt) setPrompt(''); setFlash('✓ AI edit applied'); setTimeout(() => setFlash(''), 2500); }
      else setErr(j.error || `AI edit failed (${r.status}) — try again or rephrase`);
    } catch (e) { setErr((e as Error).message); }
    setBusy('');
  }

  async function save(replace: boolean) {
    setBusy('save'); setErr('');
    try {
      const base = await bakeCurrent();
      const blob = await (await fetch(base)).blob();
      const fd = new FormData(); fd.append('slug', slug); fd.append('files', new File([blob], 'edit.jpg', { type: blob.type || 'image/jpeg' }));
      if (replace && photoId) fd.append('replaceId', String(photoId));
      const r = await fetch('/api/admin/photos', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (j.saved?.length) onSaved({ id: j.saved[0].id, filename: j.saved[0].filename, replaced: !!j.replaced });
      else setErr(j.error || 'Save failed');
    } catch (e) { setErr((e as Error).message); }
    setBusy('');
  }

  const btn = 'font-stamp uppercase tracking-[0.06em] text-xs px-3 py-2 border border-rule rounded-sm hover:border-ink disabled:opacity-50';
  return (
    <div className="fixed inset-0 z-50 bg-ink/80 flex items-start justify-center p-3 overflow-auto">
      <div className="bg-paper border-2 border-ink rounded-sm max-w-4xl w-full my-3">
        <div className="flex items-center justify-between border-b border-rule px-4 py-2 sticky top-0 bg-paper z-10">
          <span className="font-stamp uppercase tracking-[0.12em] text-ink text-sm">Photo editor</span>
          <button onClick={onClose} className="text-ink-soft text-xl leading-none">✕</button>
        </div>
        <div className="grid md:grid-cols-[1fr_270px] gap-4 p-4">
          <div className="relative flex items-center justify-center bg-paper-sunk rounded-sm min-h-[40vh] p-2 overflow-hidden">
            <ReactCrop crop={crop} onChange={(_, pct) => setCrop(pct)} aspect={aspect}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imgRef} src={work} alt="edit" crossOrigin="anonymous" style={{ filter, maxHeight: '60vh', width: 'auto' }} />
            </ReactCrop>
            {(busy === 'ai' || busy === 'save') && (
              <div className="absolute inset-0 bg-ink/65 flex flex-col items-center justify-center z-20 gap-2">
                <span className="font-stamp uppercase tracking-[0.12em] text-paper text-sm animate-pulse">{busy === 'ai' ? '✨ AI is editing' : 'Saving'}</span>
                {busy === 'ai' && <span className="font-ui text-xs text-paper/80">this takes 5-15 seconds...</span>}
              </div>
            )}
            {flash && <span className="absolute top-2 left-1/2 -translate-x-1/2 z-20 font-stamp uppercase tracking-[0.08em] text-xs bg-ink text-paper px-3 py-1.5 rounded-sm">{flash}</span>}
          </div>
          <div className="space-y-4">
            <div>
              <p className="font-stamp uppercase tracking-[0.08em] text-[11px] text-ink-soft mb-1.5">Transform</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => doRotate(-1)} disabled={!!busy} className={btn}>⟲ Left</button>
                <button onClick={() => doRotate(1)} disabled={!!busy} className={btn}>⟳ Right</button>
                <button onClick={doFlip} disabled={!!busy} className={btn}>⇋ Flip</button>
              </div>
            </div>
            <div>
              <p className="font-stamp uppercase tracking-[0.08em] text-[11px] text-ink-soft mb-1.5">Crop ratio</p>
              <div className="flex flex-wrap gap-1.5">
                {([['Free', undefined], ['1:1', 1], ['4:5', 4 / 5], ['16:9', 16 / 9], ['3:2', 3 / 2]] as [string, number | undefined][]).map(([l, a]) => (
                  <button key={l} onClick={() => setAspect(a)} className={`${btn} ${aspect === a ? 'bg-ink text-paper border-ink' : ''}`}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-stamp uppercase tracking-[0.08em] text-[11px] text-ink-soft mb-1.5">Color</p>
              {([['Brightness', bright, setBright], ['Contrast', contrast, setContrast], ['Saturation', saturate, setSaturate]] as [string, number, (n: number) => void][]).map(([l, v, set]) => (
                <label key={l} className="block font-ui text-xs text-ink-soft mb-1">{l}
                  <input type="range" min={50} max={150} value={v} onChange={(e) => set(Number(e.target.value))} className="w-full accent-chile" />
                </label>
              ))}
            </div>
            {hasPending() && (
              <button onClick={applyEdits} disabled={!!busy} className="w-full font-stamp uppercase tracking-[0.08em] text-xs border-2 border-ink text-ink py-2 rounded-sm hover:bg-ink hover:text-paper disabled:opacity-50">✓ Apply crop &amp; color (keep editing)</button>
            )}
            <div>
              <p className="font-stamp uppercase tracking-[0.08em] text-[11px] text-chile mb-1.5">✨ Magic edit (AI)</p>
              <div className="flex gap-1.5 mb-2">
                <button onClick={() => runGemini(ENHANCE)} disabled={!!busy} className="flex-1 font-stamp uppercase tracking-[0.06em] text-[11px] bg-chile text-paper py-2 rounded-sm disabled:opacity-50">⚡ Auto-enhance</button>
                <button onClick={() => runGemini(MENU_FIX)} disabled={!!busy} className="flex-1 font-stamp uppercase tracking-[0.06em] text-[11px] bg-ink text-paper py-2 rounded-sm disabled:opacity-50">📋 Fix menu</button>
              </div>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} placeholder="remove the background · warm the lighting · extend the photo wider · erase the trash can" className="w-full bg-paper border border-rule px-2 py-1.5 text-sm rounded-sm outline-none focus:border-chile" />
              <button onClick={() => runGemini(prompt, true)} disabled={!!busy || !prompt.trim()} className="mt-1 w-full font-stamp uppercase tracking-[0.08em] text-xs bg-ink text-paper py-2 rounded-sm disabled:opacity-50">{busy === 'ai' ? 'Editing with AI...' : 'Apply AI edit'}</button>
            </div>
            {err && <p className="font-ui text-xs text-oxblood">{err}</p>}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-rule">
              {photoId ? (
                <>
                  <button onClick={() => save(true)} disabled={!!busy} className="flex-1 font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper py-2.5 rounded-sm hover:bg-oxblood disabled:opacity-50">{busy === 'save' ? 'Saving...' : 'Save over original'}</button>
                  <button onClick={() => save(false)} disabled={!!busy} className="font-stamp uppercase tracking-[0.06em] text-xs border border-ink text-ink px-3 rounded-sm disabled:opacity-50">Save a copy</button>
                </>
              ) : (
                <button onClick={() => save(false)} disabled={!!busy} className="flex-1 font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper py-2.5 rounded-sm hover:bg-oxblood disabled:opacity-50">{busy === 'save' ? 'Saving...' : 'Save photo'}</button>
              )}
              <button onClick={onClose} className="font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft px-3">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
