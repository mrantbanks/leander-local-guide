import { auth, signIn } from '@/auth';
import { resolveCode } from '@/lib/owner';
import ClaimConfirm from '@/components/ClaimConfirm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Claim your listing', robots: { index: false } };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-5 py-12">
      <div className="max-w-md w-full bg-paper-raised border-2 border-ink p-7 text-center">
        <p className="font-stamp uppercase tracking-[0.2em] text-chile text-xs mb-2">The Leander Local Guide</p>
        {children}
      </div>
    </main>
  );
}

export default async function ClaimByCode({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const sp = await searchParams;
  const code = (sp.code || '').trim();

  if (!code) {
    return (
      <Shell>
        <h1 className="font-display font-black text-2xl text-ink">Claim your listing</h1>
        <p className="font-ui text-sm text-ink-soft mt-2 mb-4">Enter the claim code from your printed sheet.</p>
        <form method="get" className="flex gap-2">
          <input name="code" placeholder="LLG-XXXX" required className="flex-1 bg-paper border border-rule px-3 py-2.5 text-[16px] text-ink outline-none rounded-sm uppercase" />
          <button className="font-stamp uppercase tracking-[0.08em] text-sm bg-chile text-paper px-4 rounded-sm">Go</button>
        </form>
      </Shell>
    );
  }

  const t = await resolveCode(code);
  if (!t) return <Shell><h1 className="font-display font-black text-2xl text-ink">That code didn&apos;t work.</h1><p className="font-ui text-sm text-ink-soft mt-2">Check the spelling, or ask for a fresh sheet.</p></Shell>;
  if (t.status !== 'printed') return <Shell><h1 className="font-display font-black text-2xl text-ink">This listing is already claimed.</h1></Shell>;

  const session = await auth();
  const email = session?.user?.email;
  return (
    <Shell>
      <h1 className="font-display font-black text-3xl text-ink leading-tight">Make {t.name} yours.</h1>
      <p className="font-hand text-xl text-oxblood mt-1 mb-5">You&apos;re already in the guide. This just hands you the keys.</p>
      {email ? (
        <ClaimConfirm tokenId={t.id} name={t.name} email={email} />
      ) : (
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: `/claim?code=${encodeURIComponent(code)}` }); }}>
          <button className="font-stamp uppercase tracking-[0.1em] text-base bg-ink text-paper px-6 py-3 rounded-sm hover:bg-oxblood">Sign in with Google to claim</button>
          <p className="font-ui text-xs text-ink-soft mt-4">No password. The Google account you pick becomes your login.</p>
        </form>
      )}
    </Shell>
  );
}
