'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PhotoEditor from './PhotoEditor';
import { deletePhoto, setHeaderPhoto, reorderPhotos, setPhotoCaption, setPhotoMenu } from '@/app/actions';

type Photo = { id: number; filename: string; caption?: string | null; isMenu?: boolean; isHeader?: boolean };

export default function PhotoStudio({ slug, initial, googlePhoto }: { slug: string; initial: Photo[]; googlePhoto?: string | null }) {
  const [photos, setPhotos] = useState(initial);
  const [editing, setEditing] = useState<{ src: string; id: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [capBusy, setCapBusy] = useState(0);
  const [bulkCap, setBulkCap] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function imgToBase64(url: string): Promise<{ data: string; mime: string }> {
    const im = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    cv.getContext('2d')!.drawImage(im, 0, 0);
    return { data: cv.toDataURL('image/jpeg', 0.9).split(',')[1], mime: 'image/jpeg' };
  }
  async function autoCaption(p: Photo) {
    setCapBusy(p.id);
    try {
      const { data, mime } = await imgToBase64(`/uploads/${p.filename}?w=800`);
      const r = await fetch('/api/admin/caption', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: data, mimeType: mime }) });
      const j = await r.json();
      if (j.caption) { setPhotos((ps) => ps.map((x) => x.id === p.id ? { ...x, caption: j.caption } : x)); await setPhotoCaption(p.id, slug, j.caption); }
    } catch { /* ignore */ }
    setCapBusy(0);
  }
  async function captionAll() {
    const todo = photos.filter((p) => !p.caption);
    for (let i = 0; i < todo.length; i++) { setBulkCap(`Captioning ${i + 1}/${todo.length}...`); await autoCaption(todo[i]); }
    setBulkCap('');
  }

  async function upload(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true); setErr('');
    const fd = new FormData(); fd.append('slug', slug);
    Array.from(files).forEach((f) => fd.append('files', f));
    try {
      const r = await fetch('/api/admin/photos', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (j.saved?.length) setPhotos((p) => [...j.saved.map((s: Photo) => ({ id: s.id, filename: s.filename })), ...p]);
      if (j.error) setErr(j.error);
      else if (!j.saved?.length) setErr('No photos saved — check the file types.');
    } catch (e) { setErr('Upload failed: ' + (e as Error).message); }
    setUploading(false); router.refresh();
  }
  const [dragId, setDragId] = useState<number | null>(null);
  async function del(id: number) { if (!confirm('Delete this photo?')) return; await deletePhoto(id, slug); setPhotos((p) => p.filter((x) => x.id !== id)); router.refresh(); }
  async function header(id: number) { setPhotos((p) => p.map((x) => ({ ...x, isHeader: x.id === id ? !x.isHeader : false }))); await setHeaderPhoto(id, slug); router.refresh(); }
  async function useGoogleHeader() { const h = photos.find((p) => p.isHeader); if (!h) return; setPhotos((p) => p.map((x) => ({ ...x, isHeader: false }))); await setHeaderPhoto(h.id, slug); router.refresh(); }
  function onDrop(targetId: number) {
    if (dragId === null || dragId === targetId) { setDragId(null); return; }
    setPhotos((ps) => { const from = ps.findIndex((x) => x.id === dragId), to = ps.findIndex((x) => x.id === targetId); const arr = [...ps]; const [m] = arr.splice(from, 1); arr.splice(to, 0, m); reorderPhotos(slug, arr.map((x) => x.id)); return arr; });
    setDragId(null);
  }
  const noLocalHeader = !photos.some((p) => p.isHeader);
  async function toggleMenu(id: number, cur: boolean) { setPhotos((p) => p.map((x) => x.id === id ? { ...x, isMenu: !cur } : x)); await setPhotoMenu(id, slug, !cur); router.refresh(); }
  const img = (fn: string, w: number) => `/uploads/${fn}?w=${w}`;

  return (
    <div>
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}
        className="border-2 border-dashed border-rule rounded-sm p-6 text-center mb-5 bg-paper-raised">
        <p className="font-ui text-sm text-ink-soft mb-2">Drop images here, or</p>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="font-stamp uppercase tracking-[0.08em] text-sm bg-ink text-paper px-4 py-2 rounded-sm disabled:opacity-60">{uploading ? 'Uploading...' : 'Choose images'}</button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        <p className="font-ui text-xs text-ink-soft mt-2">Upload one or many. Then edit any photo: crop, rotate, color, or AI magic-edit.</p>
        {err && <p className="font-ui text-sm text-oxblood mt-2 bg-paper border border-oxblood rounded-sm px-3 py-2">{err}</p>}
        {note && <p role="status" className="font-ui text-sm text-ink mt-2 bg-paper border border-ink rounded-sm px-3 py-2">{note}</p>}
      </div>

      {photos.length === 0 ? (
        <p className="font-ui text-sm text-ink-soft">No photos yet.</p>
      ) : (
        <>
        <div className="flex items-center justify-between mb-2">
          <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft">{photos.length} photo{photos.length !== 1 ? 's' : ''} · drag to reorder</p>
          <button onClick={captionAll} disabled={!!bulkCap || photos.every((p) => p.caption)} className="font-stamp uppercase tracking-[0.08em] text-xs bg-chile text-paper px-3 py-1.5 rounded-sm disabled:opacity-50">{bulkCap || '✨ Auto-caption all'}</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {googlePhoto && (
            <div className="border border-rule rounded-sm overflow-hidden">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/img?n=${encodeURIComponent(googlePhoto)}&w=400`} alt="" className="w-full aspect-[4/3] object-cover" />
                <span className="absolute top-1 left-1 font-stamp uppercase tracking-[0.06em] text-sm bg-ink text-paper px-1 rounded-sm">Google</span>
                {noLocalHeader && <span className="absolute top-1 right-1 font-stamp uppercase tracking-[0.06em] text-sm bg-chile text-paper px-1 rounded-sm">Header</span>}
                {!noLocalHeader && <div className="absolute inset-x-0 bottom-0 bg-ink/75 p-1"><button onClick={useGoogleHeader} className="w-full font-stamp uppercase tracking-[0.06em] text-sm text-paper py-1">Use as header</button></div>}
              </div>
              <div className="px-2 py-1 font-ui text-sm text-ink-soft border-t border-rule">From Google · the default header</div>
            </div>
          )}
          {photos.map((p) => (
            <div key={p.id} draggable onDragStart={() => setDragId(p.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(p.id)}
              className={`border rounded-sm overflow-hidden ${dragId === p.id ? 'border-chile opacity-50' : 'border-rule'}`}>
              <div className="relative group cursor-move">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(p.filename, 400)} alt="" className="w-full aspect-[4/3] object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-ink/75 flex gap-0.5 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditing({ src: img(p.filename, 1600), id: p.id })} className="flex-1 font-stamp uppercase tracking-[0.06em] text-sm text-paper py-1">Edit</button>
                  <button onClick={() => toggleMenu(p.id, !!p.isMenu)} title={p.isMenu ? 'Unmark menu' : 'Mark as menu'} className={`font-stamp text-sm py-1 px-2 ${p.isMenu ? 'text-amber' : 'text-paper'}`}>📋</button>
                  {!p.isMenu && <button onClick={() => header(p.id)} title={p.isHeader ? 'Unset header (back to Google)' : 'Make this the header image'} className={`font-stamp text-sm py-1 px-2 ${p.isHeader ? 'text-chile' : 'text-paper'}`}>★</button>}
                  <button onClick={() => del(p.id)} title="Delete" className="font-stamp text-sm text-paper py-1 px-2">🗑</button>
                </div>
                {p.isMenu ? <span className="absolute top-1 left-1 font-stamp uppercase tracking-[0.06em] text-sm bg-amber text-ink px-1 rounded-sm">Menu</span> : p.isHeader && <span className="absolute top-1 left-1 font-stamp uppercase tracking-[0.06em] text-sm bg-chile text-paper px-1 rounded-sm">Header</span>}
              </div>
              <div className="flex items-center border-t border-rule">
                <input value={p.caption || ''} onChange={(e) => setPhotos((ps) => ps.map((x) => x.id === p.id ? { ...x, caption: e.target.value } : x))} onBlur={(e) => setPhotoCaption(p.id, slug, e.target.value)} placeholder="Caption..." className="flex-1 min-w-0 bg-paper px-2 py-1 text-xs text-ink outline-none focus:bg-paper-raised" />
                <button onClick={() => autoCaption(p)} disabled={capBusy === p.id} title="Auto-caption with AI" className="shrink-0 px-2 py-1 text-chile text-sm disabled:opacity-50">{capBusy === p.id ? '…' : '✨'}</button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {editing && <PhotoEditor slug={slug} src={editing.src} photoId={editing.id} onClose={() => setEditing(null)}
        onSaved={(saved) => {
          setEditing(null);
          setPhotos((p) => saved.replaced ? p.map((x) => x.id === saved.id ? { ...x, filename: saved.filename } : x) : [{ id: saved.id, filename: saved.filename }, ...p]);
          // Say it landed. The editor just closing is the same thing the editor does when you hit
          // cancel, so a successful save was indistinguishable from nothing having happened.
          setNote(saved.replaced ? '✓ Photo replaced — the new version is live.' : '✓ Saved as a new photo — it is live.');
          setTimeout(() => setNote(''), 6000);
          router.refresh();
        }} />}
    </div>
  );
}
