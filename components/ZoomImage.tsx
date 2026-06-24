'use client';

import { useState } from 'react';

export default function ZoomImage({ src, alt, width, height, className }: { src: string; alt: string; width?: number; height?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} height={height} onClick={() => setOpen(true)} className={`${className || ''} cursor-zoom-in`} />
      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-[100] bg-ink/90 flex items-center justify-center p-4 cursor-zoom-out" role="dialog" aria-modal="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[92vh] max-w-[92vw] object-contain border-2 border-paper" />
        </div>
      )}
    </>
  );
}
