import Link from 'next/link';
import { auth } from '@/auth';
import { setAiConfig } from '@/app/actions';
import { TASKS, getAiConfig, claudeAvailable, type Provider } from '@/lib/ai/router';

export const dynamic = 'force-dynamic';

const PROVIDER_LABEL: Record<Provider, string> = {
  gemini: 'Gemini 2.5 (Google)',
  claude: 'Claude (headless)',
  remote: 'Remote workers (fleet)',
};

export default async function AiConfigPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }
  const config = await getAiConfig();
  const hasClaude = claudeAvailable();

  return (
    <main className="max-w-3xl mx-auto px-5 py-8">
      <h1 className="font-display font-black text-3xl text-ink">AI Engines</h1>
      <p className="font-ui text-sm text-ink-soft mt-1 mb-5 max-w-2xl leading-relaxed">
        Choose which engine handles each AI job. <strong>Gemini</strong> is live. <strong>Claude</strong> {hasClaude ? 'is connected and ready.' : <span className="text-oxblood">needs an Anthropic API key (set ANTHROPIC_API_KEY) — until then, tasks set to Claude quietly fall back to Gemini.</span>} <strong>Remote workers</strong> hand the job to your worker fleet (the Boris-style nodes); they poll a worker endpoint and decide. Image edits and menu-fix always use Gemini (image model).
      </p>

      <form action={setAiConfig} className="space-y-4">
        {TASKS.map((t) => (
          <div key={t.task} className="border border-rule rounded-sm p-4 bg-paper-raised">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display font-semibold text-ink">{t.label}</p>
                <p className="font-ui text-xs text-ink-soft mt-0.5 max-w-xl">{t.desc}</p>
              </div>
              <select name={t.task} defaultValue={config[t.task]} className="bg-paper border border-rule px-3 py-2 font-ui text-sm text-ink rounded-[2px] shrink-0">
                {t.allow.map((p) => (
                  <option key={p} value={p}>{PROVIDER_LABEL[p]}{p === 'claude' && !hasClaude ? ' — needs key' : ''}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
        <button className="font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-5 py-2.5 rounded-sm hover:bg-oxblood">Save engine map</button>
      </form>

      <div className="mt-8 border-t border-rule pt-4 font-ui text-xs text-ink-soft leading-relaxed space-y-2">
        <p><strong className="text-ink">Remote workers + moderation:</strong> when moderation is set to Remote, the server stops moderating inline; your worker fleet claims pending reviews/tips from <code className="text-chile">GET /api/worker/moderation</code> and posts verdicts back (same x-worker-secret as events). The hard spam/links/profanity guardrail is re-applied server-side on every approve, so a worker can never publish junk.</p>
        <p><strong className="text-ink">Claude / headless:</strong> set <code className="text-chile">ANTHROPIC_API_KEY</code> (and optionally <code className="text-chile">CLAUDE_MODEL</code>) in the container env to turn it on. Good fit for the happy-hour cron and moderation; image jobs stay on Gemini.</p>
      </div>
    </main>
  );
}
