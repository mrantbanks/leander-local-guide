import { ICONS } from '@/lib/icons';

/**
 * One of our own cut blocks. See lib/icons.ts for why they look the way they do.
 *
 * The icon takes the colour of whatever it sits in (fill is currentColor), so it inherits text-chile,
 * text-ink-soft, hover states, print black, all of it, for free. Size it with a class, not a prop.
 *
 * `fallback` is the emoji we used to ship. Any name we have not cut a block for yet still renders
 * something rather than a hole, which means we can add blocks one at a time instead of all at once.
 */
export default function Icon({
  name,
  className = 'w-6 h-6',
  fallback,
}: {
  name: string;
  className?: string;
  fallback?: string;
}) {
  const inner = ICONS[name];
  if (!inner) return fallback ? <span aria-hidden="true">{fallback}</span> : null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
