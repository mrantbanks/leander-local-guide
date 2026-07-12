import Link from 'next/link';

/**
 * One event, as it appears on the What's On board.
 *
 * Shared on purpose: /whats-on renders it, and so does the live preview in the event composer. An
 * owner adding their trivia night sees the ACTUAL card, not an approximation of it, because it is
 * the same component. A preview that drifts from the real thing is worse than no preview.
 */
export default function EventCard({
  emoji, time, typeLabel, title, spot, slug, unconfirmed = false, preview = false,
}: {
  emoji: string;
  time: string | null;
  typeLabel: string;
  title: string;
  spot: string;
  slug?: string;
  unconfirmed?: boolean;
  /** In the composer there is nowhere to navigate to, so render the same box without the link. */
  preview?: boolean;
}) {
  const inner = (
    <>
      <span className="text-3xl leading-none shrink-0" aria-hidden="true">{emoji}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-stamp uppercase tracking-[0.08em] text-chile text-base">{time || 'Time TBA'}</span>
          <span className="font-stamp uppercase tracking-[0.08em] text-sm text-ink-soft">{typeLabel}</span>
        </div>
        <p className={`font-display font-bold text-ink text-xl leading-tight mt-1 ${preview ? '' : 'transition-colors group-hover:text-oxblood'}`}>
          {title || 'Your event title shows up here'}
        </p>
        <p className="font-ui text-base text-ink-soft mt-0.5 truncate">{spot}</p>
        {unconfirmed && (
          <p className="font-stamp uppercase tracking-[0.06em] text-sm text-ink-soft/80 mt-1.5">⚠ Unconfirmed, call ahead</p>
        )}
      </div>
    </>
  );

  const box = 'flex gap-3 h-full border border-rule bg-paper-raised rounded-sm p-4';

  if (preview || !slug) return <div className={box}>{inner}</div>;

  return (
    <Link href={`/r/${slug}`} className={`group ${box} transition-colors hover:border-ink hover:bg-paper`}>
      {inner}
    </Link>
  );
}
