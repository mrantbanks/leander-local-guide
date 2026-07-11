import Link from 'next/link';
import { pool } from '@/lib/db';
import { auth } from '@/auth';
import { addProvider, toggleProvider, deleteProvider, createBroadcast } from './actions';

export const dynamic = 'force-dynamic';

const field = 'w-full bg-paper border border-rule px-3 py-2 font-ui text-sm text-ink focus:border-chile outline-none mb-2';
const label = 'block font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mt-3 mb-1';

export default async function EmailAdminPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }
  const [subs, sends, providers, campaigns, ar] = await Promise.all([
    pool.query("select count(*) filter (where status='confirmed')::int confirmed, count(*) filter (where status='pending')::int pending, count(*) filter (where status='unsubscribed')::int unsub, count(*)::int total from subscribers"),
    pool.query("select count(*) filter (where status='sent')::int sent, count(*) filter (where status='failed')::int failed, count(*) filter (where kind='confirm' and status='sent')::int confirms, count(*) filter (where kind='autoresponder' and status='sent')::int drip, count(*) filter (where kind='broadcast' and status='sent')::int broadcasts from email_sends"),
    pool.query('select id,name,kind,enabled,priority,daily_quota,monthly_quota,sent_today,sent_month from email_providers order by priority, id'),
    pool.query("select id,subject,status,scheduled_at,sent_at,recipients from email_campaigns where kind='broadcast' order by created_at desc limit 10"),
    pool.query("select count(*) filter (where status='confirmed' and ar_next_due is not null)::int active, count(*) filter (where status='confirmed' and ar_next_due is null and ar_step>0)::int graduated from subscribers"),
  ]);
  const s = subs.rows[0], se = sends.rows[0], a = ar.rows[0];
  const Tile = ({ n, l, accent }: { n: number | string; l: string; accent?: boolean }) => (
    <div className="border border-rule bg-paper-raised p-3 text-center">
      <div className={`font-display font-black text-3xl ${accent ? 'text-chile' : 'text-ink'}`}>{n}</div>
      <div className="font-stamp uppercase tracking-[0.1em] text-sm text-ink-soft mt-1">{l}</div>
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto px-5 py-8">
      <h1 className="font-display font-black text-3xl text-ink">Email</h1>
      <p className="font-ui text-sm text-ink-soft mt-1 mb-6 max-w-2xl leading-relaxed">Your owned audience. Capture is live across the site (double opt-in). New subscribers walk a 6-month welcome drip automatically; you can also send one-off broadcasts. Delivery routes through the providers below in priority order, each capped by its own daily and monthly quota.</p>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        <Tile n={s.confirmed} l="Confirmed" accent={s.confirmed > 0} />
        <Tile n={s.pending} l="Pending" />
        <Tile n={s.unsub} l="Unsubscribed" />
        <Tile n={a.active} l="In drip" />
        <Tile n={se.sent} l="Emails sent" />
        <Tile n={se.failed} l="Failed" accent={se.failed > 0} />
      </div>

      {/* Providers */}
      <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-1">Mail providers</h2>
      <p className="font-ui text-xs text-ink-soft mb-3 max-w-2xl">Add a real service (Mailjet, Resend, SendGrid) and it takes over from the console logger. Lowest priority number is tried first; when one hits its quota, sending fails over to the next.</p>
      <div className="overflow-x-auto mb-4">
        <table className="w-full font-ui text-sm">
          <thead><tr className="text-left border-b border-rule font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft">
            <th className="py-2">Provider</th><th>Kind</th><th>Priority</th><th>Today</th><th>Month</th><th>On</th><th></th>
          </tr></thead>
          <tbody>
            {providers.rows.map((p) => (
              <tr key={p.id} className="border-b border-rule/50">
                <td className="py-2 font-semibold text-ink">{p.name}</td>
                <td className="text-ink-soft">{p.kind}</td>
                <td>{p.priority}</td>
                <td className={p.sent_today >= p.daily_quota ? 'text-oxblood' : ''}>{p.sent_today} / {p.daily_quota}</td>
                <td className={p.sent_month >= p.monthly_quota ? 'text-oxblood' : ''}>{p.sent_month} / {p.monthly_quota}</td>
                <td><span className={`inline-block w-2 h-2 rounded-full ${p.enabled ? 'bg-amber' : 'bg-rule'}`} /></td>
                <td className="text-right whitespace-nowrap">
                  <form action={toggleProvider.bind(null, p.id as number)} className="inline"><button className="text-chile font-stamp uppercase tracking-[0.06em] text-xs mr-3">{p.enabled ? 'Disable' : 'Enable'}</button></form>
                  <form action={deleteProvider.bind(null, p.id as number)} className="inline"><button className="text-oxblood font-stamp uppercase tracking-[0.06em] text-xs">Delete</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="mb-10 border border-rule bg-paper-raised p-4">
        <summary className="font-stamp uppercase tracking-[0.08em] text-xs text-chile cursor-pointer">+ Add a provider</summary>
        <form action={addProvider} className="mt-3 max-w-md">
          <label className={label}>Name</label>
          <input name="name" placeholder="Mailjet (primary)" className={field} />
          <label className={label}>Kind</label>
          <select name="kind" className={field} defaultValue="mailjet">
            <option value="mailjet">Mailjet</option>
            <option value="resend">Resend</option>
            <option value="sendgrid">SendGrid</option>
            <option value="log">Console (log only)</option>
          </select>
          <label className={label}>From address</label>
          <input name="from" defaultValue="Anthony@leanderlocalguide.com" className={field} />
          <label className={label}>API key (Mailjet: API key · Resend/SendGrid: key)</label>
          <input name="apiKey" className={field} />
          <label className={label}>API secret (Mailjet only)</label>
          <input name="apiSecret" className={field} />
          <div className="flex gap-3">
            <div><label className={label}>Daily quota</label><input name="daily" type="number" defaultValue="200" className={field} /></div>
            <div><label className={label}>Monthly quota</label><input name="monthly" type="number" defaultValue="6000" className={field} /></div>
            <div><label className={label}>Priority</label><input name="priority" type="number" defaultValue="10" className={field} /></div>
          </div>
          <button className="mt-2 font-stamp uppercase tracking-[0.1em] text-sm bg-ink text-paper px-5 py-2 hover:bg-chile">Add provider</button>
        </form>
      </details>

      {/* Broadcast composer */}
      <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-1">Send a broadcast</h2>
      <p className="font-ui text-xs text-ink-soft mb-3 max-w-2xl">Goes to every confirmed subscriber. Leave the schedule blank to send on the next tick (within a few minutes). Plain text is fine; blank lines become paragraphs, and the Leander Local header/footer wrap it automatically.</p>
      <form action={createBroadcast} className="max-w-2xl mb-8">
        <label className={label}>Subject</label>
        <input name="subject" placeholder="What's On in Leander this week" className={field} />
        <label className={label}>Body</label>
        <textarea name="body" rows={8} placeholder={"Here's where to be this week...\n\nNew this week: ...\n\nWorth the drive: ..."} className={field} />
        <label className={label}>Schedule (optional, your local time)</label>
        <input name="scheduledAt" type="datetime-local" className={field} />
        <button className="mt-2 font-stamp uppercase tracking-[0.1em] text-base bg-chile text-paper px-6 py-2.5 hover:bg-oxblood">Queue broadcast</button>
      </form>

      {campaigns.rows.length > 0 && (
        <>
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-2">Recent broadcasts</h2>
          <table className="w-full font-ui text-sm">
            <thead><tr className="text-left border-b border-rule font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft"><th className="py-2">Subject</th><th>Status</th><th>Recipients</th><th>When</th></tr></thead>
            <tbody>
              {campaigns.rows.map((c) => (
                <tr key={c.id} className="border-b border-rule/50">
                  <td className="py-2 text-ink">{c.subject}</td>
                  <td className="text-ink-soft">{c.status}</td>
                  <td>{c.recipients || '—'}</td>
                  <td className="text-ink-soft text-xs">{c.sent_at ? new Date(c.sent_at).toLocaleString() : c.scheduled_at ? `scheduled ${new Date(c.scheduled_at).toLocaleString()}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
