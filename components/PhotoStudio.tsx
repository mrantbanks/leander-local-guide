'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PhotoEditor from './PhotoEditor';
import { deletePhoto, makePrimaryPhoto } from '@/app/actions';

type Photo = { id: number; filename: string };

export default function PhotoStudio({ slug, initial }: { slug: string; initial: Photo[] }) {
  const [photos, setPhotos] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    const fd = new FormData(); fd.append('slug', slug);
    Array.from(files).forEach((f) => fd.append('files', f));
    try {
      const r = await fetch('/api/admin/photos', { method: 'POST', body: fd });
      const j = await r.json();
      if (j.saved?.length) setPhotos((p) => [...j.saved.map((s: Photo) => ({ id: s.id, filename: s.filename })), ...p]);
    } catch { /* ignore */ }
    setUploading(false); router.refresh();
  }
  async function del(id: number) { if (!confirm('Delete this photo?')) return; await deletePhoto(id, slug); setPhotos((p) => p.filter((x) => x.id !== id)); router.refresh(); }
  async function primary(id: number) { setPhotos((p) => { const t = p.find((x) => x.id === id); return t ? [t, ...p.filter((x) => x.id !== id)] : p; }); await makePrimaryPhoto(id, slug); router.refresh(); }
  const img = (fn: string, w: number) => `/img?n=${encodeURIComponent(fn)}&w=${w}`;

  return (
    <div>
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}
        className="border-2 border-dashed border-rule rounded-sm p-6 text-center mb-5 bg-paper-raised">
        <p className="font-ui text-sm text-ink-soft mb-2">Drop images here, or</p>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="font-stamp uppercase tracking-[0.08em] text-sm bg-ink text-paper px-4 py-2 rounded-sm disabled:opacity-60">{uploading ? 'Uploading...' : 'Choose images'}</button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        <p className="font-ui text-xs text-ink-soft mt-2">Upload one or many. Then edit any photo: crop, rotate, color, or AI magic-edit.</p>
      </div>

      {photos.length === 0 ? (
        <p className="font-ui text-sm text-ink-soft">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={p.id} className="relative group border border-rule rounded-sm overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(p.filename, 400)} alt="" className="w-full aspect-[4/3] object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-ink/75 flex gap-0.5 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditing(img(p.filename, 1600))} className="flex-1 font-stamp uppercase tracking-[0.06em] text-[10px] text-paper py-1">Edit</button>
                {i !== 0 && <button onClick={() => primary(p.id)} title="Make main" className="font-stamp text-[11px] text-paper py-1 px-2">★</button>}
                <button onClick={() => del(p.id)} title="Delete" className="font-stamp text-[11px] text-paper py-1 px-2">🗑</button>
              </div>
              {i === 0 && <span className="absolute top-1 left-1 font-stamp uppercase tracking-[0.06em] text-[9px] bg-chile text-paper px-1 rounded-sm">Main</span>}
            </div>
          ))}
        </div>
      )}

      {editing && <PhotoEditor slug={slug} src={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}
    </div>
  );
}
