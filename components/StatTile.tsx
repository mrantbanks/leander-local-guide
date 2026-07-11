// The little number-over-caption box used across the admin desks. It existed three times, copied
// into app/admin/page.tsx, app/admin/workers/page.tsx and app/admin/email/page.tsx with three
// different prop names (n/label, value/label, n/l), and all three were declared INSIDE their page's
// render, which makes them a fresh component type every render: React tears them down and rebuilds
// them instead of reconciling, and any state inside would reset. One component, at module scope.
export default function StatTile({ label, value, accent = false }: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="border border-rule bg-paper-raised p-3 text-center">
      <div className={`font-display font-black text-3xl ${accent ? 'text-chile' : 'text-ink'}`}>{value}</div>
      <div className="font-stamp uppercase tracking-[0.1em] text-sm text-ink-soft mt-1">{label}</div>
    </div>
  );
}
