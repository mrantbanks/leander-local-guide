import Link from 'next/link';

export default function PageHero({
  eyebrow = 'Leander, Texas',
  emoji,
  title,
  subtitle,
  back = true,
}: {
  eyebrow?: string;
  emoji?: string;
  title: string;
  subtitle?: string;
  back?: boolean;
}) {
  return (
    <header className="border-b-2 border-ink">
      <div className="max-w-6xl mx-auto px-5 pt-8 pb-5">
        {back && (
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft hover:text-chile transition-colors mb-4"
          >
            ← Back to the guide
          </Link>
        )}
        <p className="font-stamp uppercase tracking-[0.2em] text-chile text-sm mb-2">{eyebrow}</p>
        <h1
          className="font-display font-black text-ink leading-[0.92] tracking-[-0.02em]"
          style={{ fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }}
        >
          {emoji && <span className="mr-2">{emoji}</span>}
          {title}
        </h1>
        {subtitle && <p className="mt-3 font-ui text-ink-soft max-w-xl">{subtitle}</p>}
      </div>
    </header>
  );
}
