// The little number-over-caption box used across the admin desks. It existed three times, copied
// into app/admin/page.tsx, app/admin/workers/page.tsx and app/admin/email/page.tsx with three
// different prop names (n/label, value/label, n/l), and all three were declared INSIDE their page's
// render, which makes them a fresh component type every render: React tears them down and rebuilds
// them instead of reconciling, and any state inside it resets. One component, at module scope.
export default function StatTile({ label, value, accent = false, sub, zeroText, delta }: {
  label: string;
  value: number | string;
  accent?: boolean;
  /** Small print under the number. Use it to say WHEN we started counting, or what the number is not. */
  sub?: string;
  /**
   * What to render instead of a big black 0.
   *
   * A guide with 42 search clicks a month will show a lot of zeros for a while, and a huge
   * font-display 0 reads as the product announcing its own failure. It is also the exact
   * "1 local weighed in" trap this site already learned once: a tiny number is worse than no number.
   * Say "nothing yet" quietly instead, and keep the tile honest rather than loud.
   */
  zeroText?: string;
  /** Change vs the previous equal-length window. Omit entirely when there is nothing to compare. */
  delta?: number | null;
}) {
  const isZero = value === 0 || value === '0';
  const showZeroText = isZero && zeroText;
  const arrow = delta == null || delta === 0 ? null : delta > 0 ? '▲' : '▼';

  return (
    <div className="border border-rule bg-paper-raised p-3 text-center">
      {showZeroText ? (
        <div className="font-ui text-sm text-ink-soft py-2 leading-tight">{zeroText}</div>
      ) : (
        <div className={`font-display font-black text-3xl ${accent && !isZero ? 'text-chile' : 'text-ink'}`}>{value}</div>
      )}
      <div className="font-stamp uppercase tracking-[0.1em] text-sm text-ink-soft mt-1">{label}</div>
      {arrow && !showZeroText && (
        <div className={`font-stamp uppercase tracking-[0.06em] text-xs mt-0.5 ${delta! > 0 ? 'text-chile' : 'text-ink-soft'}`}>
          {arrow} {delta! > 0 ? '+' : ''}{delta}
        </div>
      )}
      {sub && <div className="font-ui text-xs text-ink-soft mt-1 leading-snug">{sub}</div>}
    </div>
  );
}
