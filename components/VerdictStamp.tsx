// Anthony's hand-set judgment, the brand's signature element.
export function verdictFor(rating?: number | null): string {
  if (rating == null) return 'UNRATED';
  if (rating >= 4.7) return 'WORTH THE GRAVEL';
  if (rating >= 4.3) return 'WORTH IT';
  if (rating >= 3.8) return 'SOLID';
  return 'SKIP IT';
}

export default function VerdictStamp({
  rating,
  label,
  light = false,
  className = '',
}: {
  rating?: number | null;
  label?: string | null; // Anthony's explicit verdict, overrides rating-derived
  light?: boolean;
  className?: string;
}) {
  const v = label || verdictFor(rating);
  const tone = light ? 'text-paper border-paper/70' : 'text-oxblood border-oxblood/70';
  return (
    <span
      aria-label={`Anthony's verdict: ${v}`}
      className={`inline-block font-stamp uppercase tracking-[0.06em] border-2 rounded-[2px] px-2 py-0.5 leading-none -rotate-3 ${tone} ${className}`}
    >
      {v}
    </span>
  );
}
