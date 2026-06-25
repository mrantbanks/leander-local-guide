'use client';

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="font-stamp uppercase tracking-[0.1em] text-sm bg-ink text-paper px-5 py-2.5 rounded-sm hover:bg-oxblood">
      🖨 Print this ticket
    </button>
  );
}
