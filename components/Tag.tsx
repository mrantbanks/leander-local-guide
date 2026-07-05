// Rubber-stamp chips, Bebas caps, 1px outline, slight rotation. Never colored bubbles.
interface TagProps {
  label: string;
}

const accent: Record<string, string> = {
  'Food Truck': 'text-amber-700 border-amber-600/60', // amber reserved for live/mobile energy
  'Coming Soon': 'text-chile border-chile border-2 font-bold', // loudest outline in the set: it announces, not describes
};

export default function Tag({ label }: TagProps) {
  const cls = accent[label] ?? 'text-oxblood border-oxblood/50';
  return (
    <span
      aria-label={label}
      className={`inline-block font-stamp uppercase tracking-[0.08em] text-[13px] leading-none px-2 py-1 border rounded-[2px] -rotate-1 ${cls}`}
    >
      {label}
    </span>
  );
}
