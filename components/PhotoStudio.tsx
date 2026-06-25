'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PhotoEditor from './PhotoEditor';
import { deletePhoto, makePrimaryPhoto, setPhotoCaption, setPhotoMenu } from '@/app/actions';

type Photo = { id: number; filename: string; caption?: string | null; isMenu?: boolean };

export default function PhotoStudio({ slug, initial }: { slug: string; initial: Photo[] }) {
  const [photos, setPhotos] = useState(initial);
  const [editing, setEditing] = useState<{ src: string; id: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [capBusy, setCapBusy] = useState(0);
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
  async function del(id: number) { if (!confirm('Delete this photo?')) return; await deletePhoto(id, slug); setPhotos((p) => p.filter((x) => x.id !== id)); router.refresh(); }
  async function primary(id: number) { setPhotos((p) => { const t = p.find((x) => x.id === id); return t ? [t, ...p.filter((x) => x.id !== id)] : p; }); await makePrimaryPhoto(id, slug); router.refresh(); }
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
      </div>

      {photos.length === 0 ? (
        <p className="font-ui text-sm text-ink-soft">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={p.id} className="border border-rule rounded-sm overflow-hidden">
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img(p.filename, 400)} alt="" className="w-full aspect-[4/3] object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-ink/75 flex gap-0.5 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditing({ src: img(p.filename, 1600), id: p.id })} className="flex-1 font-stamp uppercase tracking-[0.06em] text-[10px] text-paper py-1">Edit</button>
                  <button onClick={() => toggleMenu(p.id, !!p.isMenu)} title={p.isMenu ? 'Unmark menu' : 'Mark as menu'} className={`font-stamp text-[11px] py-1 px-2 ${p.isMenu ? 'text-amber' : 'text-paper'}`}>📋</button>
                  {i !== 0 && !p.isMenu && <button onClick={() => primary(p.id)} title="Make main" className="font-stamp text-[11px] text-paper py-1 px-2">★</button>}
                  <button onClick={() => del(p.id)} title="Delete" className="font-stamp text-[11px] text-paper py-1 px-2">🗑</button>
                </div>
                {p.isMenu ? <span className="absolute top-1 left-1 font-stamp uppercase tracking-[0.06em] text-[9px] bg-amber text-ink px-1 rounded-sm">Menu</span> : i === 0 && <span className="absolute top-1 left-1 font-stamp uppercase tracking-[0.06em] text-[9px] bg-chile text-paper px-1 rounded-sm">Main</span>}
              </div>
              <div className="flex items-center border-t border-rule">
                <input value={p.caption || ''} onChange={(e) => setPhotos((ps) => ps.map((x) => x.id === p.id ? { ...x, caption: e.target.value } : x))} onBlur={(e) => setPhotoCaption(p.id, slug, e.target.value)} placeholder="Caption..." className="flex-1 min-w-0 bg-paper px-2 py-1 text-xs text-ink outline-none focus:bg-paper-raised" />
                <button onClick={() => autoCaption(p)} disabled={capBusy === p.id} title="Auto-caption with AI" className="shrink-0 px-2 py-1 text-chile text-sm disabled:opacity-50">{capBusy === p.id ? '…' : '✨'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <PhotoEditor slug={slug} src={editing.src} photoId={editing.id} onClose={() => setEditing(null)}
        onSaved={(saved) => {
          setEditing(null);
          setPhotos((p) => saved.replaced ? p.map((x) => x.id === saved.id ? { ...x, filename: saved.filename } : x) : [{ id: saved.id, filename: saved.filename }, ...p]);
          router.refresh();
        }} />}
    </div>
  );
}
