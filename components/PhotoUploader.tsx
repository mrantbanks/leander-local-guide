'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function PhotoUploader({ slug }: { slug: string }) {
  const [pics, setPics] = useState<Pic[]>([]);
  const [maxDim, setMaxDim] = useState(1600);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function add(files: FileList | null) {
    if (!files) return;
    setPics((p) => [...p, ...[...files].filter((f) => f.type.startsWith('image/')).map((f) => ({ file: f, url: URL.createObjectURL(f), rot: 0 }))]);
  }
  const rotate = (i: number) => setPics((p) => p.map((x, j) => (j === i ? { ...x, rot: (x.rot + 90) % 360 } : x)));
  const remove = (i: number) => setPics((p) => p.filter((_, j) => j !== i));

  async function upload() {
    if (!pics.length) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('slug', slug);
    for (const p of pics) fd.append('photos', await process(p.file, p.rot, maxDim), 'photo.jpg');
    const r = await fetch('/admin/upload', { method: 'POST', body: fd });
    setBusy(false);
    if (r.ok) { setPics([]); router.refresh(); } else { alert('Upload failed'); }
  }

  return (
    <div className="mt-6 border border-rule bg-paper-raised p-4">
      <label className="block font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft mb-2">Add photos (multiple OK)</label>
      <input type="file" accept="image/*" multiple onChange={(e) => add(e.target.files)} className="font-ui text-sm" />
      {pics.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-3">
            {pics.map((p, i) => (
              <div key={i} className="relative w-24 h-24 border border-rule overflow-hidden bg-paper-sunk">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" style={{ transform: `rotate(${p.rot}deg)` }} className="w-full h-full object-cover" />
                <button type="button" onClick={() => rotate(i)} title="Rotate" className="absolute bottom-0 left-0 bg-ink/70 text-paper text-xs px-1.5 py-0.5">↻</button>
                <button type="button" onClick={() => remove(i)} title="Remove" className="absolute top-0 right-0 bg-oxblood/85 text-paper text-xs px-1.5 py-0.5">×</button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 font-ui text-sm flex-wrap">
            <span className="text-ink-soft">Resize to</span>
            <select value={maxDim} onChange={(e) => setMaxDim(Number(e.target.value))} className="bg-paper border border-rule px-2 py-1 rounded-[2px]">
              <option value={2400}>Large (2400px)</option>
              <option value={1600}>Medium (1600px)</option>
              <option value={1000}>Small (1000px)</option>
            </select>
            <button type="button" onClick={upload} disabled={busy} className="ml-auto font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-5 py-2 hover:bg-oxblood disabled:opacity-50 transition-colors">
              {busy ? 'Uploading…' : `Upload ${pics.length}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
