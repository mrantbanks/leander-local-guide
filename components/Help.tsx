'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * A small "(?)" button that reveals a plain-language explanation + an example.
 * Click to toggle; closes on outside-click or Escape.
 */
export default function Help({ text, example }: { text: string; example?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label="What's this?"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-grid place-items-center w-[15px] h-[15px] ml-1 rounded-full border border-chile text-chile text-[12px] leading-none normal-case tracking-normal hover:bg-chile hover:text-paper align-middle"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-[calc(100%+6px)] z-30 w-60 bg-paper-raised border border-rule rounded-sm p-3 shadow-lg text-left normal-case tracking-normal"
        >
          <span className="block font-ui text-xs text-ink leading-relaxed">{text}</span>
          {example && (
            <span className="block mt-1.5 font-ui text-xs text-ink-soft leading-relaxed">
              <b className="font-stamp uppercase tracking-[0.06em] text-chile text-[12px]">e.g.</b> {example}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
