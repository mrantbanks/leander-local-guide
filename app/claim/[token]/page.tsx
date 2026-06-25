import { auth, signIn } from '@/auth';
import { resolveToken } from '@/lib/owner';
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

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await resolveToken(token);

  if (!t) return <Shell><h1 className="font-display font-black text-2xl text-ink">Hmm, that code didn&apos;t work.</h1><p className="font-ui text-sm text-ink-soft mt-2">It may be mistyped or expired. Ask for a fresh one.</p></Shell>;
  if (t.status !== 'printed') return <Shell><h1 className="font-display font-black text-2xl text-ink">This listing is already claimed.</h1><p className="font-ui text-sm text-ink-soft mt-2">If that wasn&apos;t you, get in touch and we&apos;ll sort it out.</p></Shell>;

  const session = await auth();
  const email = session?.user?.email;

  return (
    <Shell>
      <h1 className="font-display font-black text-3xl text-ink leading-tight">Make {t.name} yours.</h1>
      <p className="font-hand text-xl text-oxblood mt-1 mb-5">You&apos;re already in the guide. This just hands you the keys.</p>
      {email ? (
        <ClaimConfirm tokenId={t.id} name={t.name} email={email} />
      ) : (
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: `/claim/${token}` }); }}>
          <button className="font-stamp uppercase tracking-[0.1em] text-base bg-ink text-paper px-6 py-3 rounded-sm hover:bg-oxblood">
            Sign in with Google to claim
          </button>
          <p className="font-ui text-xs text-ink-soft mt-4">No password. The Google account you pick becomes your login.</p>
        </form>
      )}
    </Shell>
  );
}
