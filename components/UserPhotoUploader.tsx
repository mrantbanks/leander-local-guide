'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Turnstile from '@/components/Turnstile';

type Pic = { file: File; url: string; rot: number };

async function process(file: File, rot: number, maxDim: number): Promise<Blob> {
  const img = await createImageBitmap(file);
  const swap = rot % 180 !== 0;
  let dw = swap ? img.height : img.width;
  let dh = swap ? img.width : img.height;
  const scale = Math.min(1, maxDim / Math.max(dw, dh));
  dw = Math.round(dw * scale);
  dh = Math.round(dh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(dw / 2, dh / 2);
  ctx.rotate((rot * Math.PI) / 180);
  const drawW = swap ? dh : dw;
  const drawH = swap ? dw : dh;
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.85));
}

export default function UserPhotoUploader({ slug, siteKey }: { slug: string; siteKey: string }) {
  const [pics, setPics] = useState<Pic[]>([]);
  const [rights, setRights] = useState(false);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  function add(files: FileList | null) {
    if (!files) return;
    setPics((p) => [...p, ...[...files].filter((f) => f.type.startsWith('image/')).slice(0, 6).map((f) => ({ file: f, url: URL.createObjectURL(f), rot: 0 }))]);
  }
  const rotate = (i: number) => setPics((p) => p.map((x, j) => (j === i ? { ...x, rot: (x.rot + 90) % 360 } : x)));
  const remove = (i: number) => setPics((p) => p.filter((_, j) => j !== i));

  async function upload() {
    if (!pics.length || !rights || !token) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('slug', slug);
    fd.append('rights', 'true');
    fd.append('turnstileToken', token);
    for (const p of pics) fd.append('photos', await process(p.file, p.rot, 1600), 'photo.jpg');
    const r = await fetch('/contribute/upload', { method: 'POST', body: fd });
    setBusy(false);
    if (r.ok) { setPics([]); setDone(true); router.refresh(); } else { const e = await r.json().catch(() => ({})); alert(e.error || 'Upload failed'); }
  }

  if (done) return <p className="font-hand text-xl text-oxblood">Thanks. Your photos are in the queue, Anthony will wave them through.</p>;

  return (
    <div>
      <input type="file" accept="image/*" multiple onChange={(e) => add(e.target.files)} className="font-ui text-sm" />
      {pics.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-3">
            {pics.map((p, i) => (
              <div key={i} className="relative w-20 h-20 border border-rule overflow-hidden bg-paper-sunk">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" style={{ transform: `rotate(${p.rot}deg)` }} className="w-full h-full object-cover" />
                <button type="button" onClick={() => rotate(i)} className="absolute bottom-0 left-0 bg-ink/70 text-paper text-xs px-1">↻</button>
                <button type="button" onClick={() => remove(i)} className="absolute top-0 right-0 bg-oxblood/85 text-paper text-xs px-1">×</button>
              </div>
            ))}
          </div>
          <label className="flex items-start gap-2 mt-3 font-ui text-xs text-ink-soft">
            <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5" />
            I took these photos (or have the rights to share them) and grant the guide permission to display them.
          </label>
          <Turnstile siteKey={siteKey} onToken={setToken} />
          <button type="button" onClick={upload} disabled={busy || !rights || !token} className="mt-1 font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-5 py-2 hover:bg-oxblood disabled:opacity-50 transition-colors">
            {busy ? 'Sending…' : `Submit ${pics.length} for review`}
          </button>
        </>
      )}
    </div>
  );
}
