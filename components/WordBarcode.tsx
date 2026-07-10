'use client';

import { useEffect, useRef } from 'react';

// Easter egg: a "barcode" that's secretly a word — the text rendered to an
// offscreen canvas, then sliced column-by-column into bars, so the bars' shape
// IS the word. At a glance it reads as a barcode; look closely and it's the name.
export default function WordBarcode({ text, className = '', height = 34 }: { text: string; className?: string; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => {
      const W = cv.clientWidth | 0;
      const H = height;
      if (W <= 0) return; // not laid out yet — ResizeObserver will call us again
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = W * dpr;
      cv.height = H * dpr;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const word = (text || '').toUpperCase().trim() || ' ';
      const oc = document.createElement('canvas');
      oc.width = W;
      oc.height = H;
      const o = oc.getContext('2d');
      if (!o) return;
      o.fillStyle = '#fff';
      o.fillRect(0, 0, W, H);
      o.fillStyle = '#000';
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      const font = (s: number) => `700 ${s}px "Bebas Neue","Arial Narrow","Hanken Grotesk",sans-serif`;
      let fs = 30;
      o.font = font(fs);
      while (o.measureText(word).width > W - 6 && fs > 7) { fs -= 1; o.font = font(fs); }
      o.fillText(word, W / 2, H / 2 + 1);
      const d = o.getImageData(0, 0, W, H).data;

      ctx.fillStyle = '#16130F'; // ink
      const barW = 2, step = 3;
      for (let x = 0; x < W; x += step) {
        let top = -1, bot = -1;
        for (let y = 0; y < H; y++) {
          let covered = false;
          for (let xx = x; xx < Math.min(W, x + barW); xx++) {
            if (d[(y * W + xx) * 4] < 128) { covered = true; break; }
          }
          if (covered) { if (top < 0) top = y; bot = y; }
        }
        if (top < 0) { ctx.globalAlpha = 0.3; ctx.fillRect(x, H / 2 - 1, barW, 2); ctx.globalAlpha = 1; } // gap → faint tick keeps the barcode look
        else ctx.fillRect(x, top, barW, bot - top + 1);
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [text, height]);

  return <canvas ref={ref} aria-hidden="true" className={className} style={{ width: '100%', height, display: 'block' }} />;
}
