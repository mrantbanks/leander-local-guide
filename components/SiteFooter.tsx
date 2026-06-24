import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink mt-10">
      <div className="max-w-6xl mx-auto px-5 py-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between font-ui text-xs text-ink-soft">
        <span className="font-display font-bold text-base text-ink">Leander Local Guide</span>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/about" className="hover:text-chile">About</Link>
          <Link href="/best" className="hover:text-chile">Best Of</Link>
          <Link href="/contact" className="hover:text-chile">Contact</Link>
          <Link href="/privacy" className="hover:text-chile">Privacy</Link>
          <Link href="/terms" className="hover:text-chile">Terms</Link>
        </nav>
        <span>Made by a local. Local-first. Leander, TX.</span>
      </div>
    </footer>
  );
}
