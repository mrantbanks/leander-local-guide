import Link from 'next/link';
import { pool } from '@/lib/db';
import { auth } from '@/auth';
import AdminNav from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

function ago(d: string | Date): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const DEC_STYLE: Record<string, string> = {
  approve: 'bg-amber text-ink', reject: 'bg-oxblood text-paper', unsure: 'border border-rule text-ink-soft',
};

export default async function WorkersPage() {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
    return <main className="max-w-md mx-auto px-5 py-24 text-center"><p className="font-ui text-sm text-ink-soft">Admins only. <Link href="/admin" className="text-chile">Sign in</Link></p></main>;
  }
  const [nodes, queue, recent, tally] = await Promise.all([
    pool.query(`select id, last_seen, first_seen, status, processed, errors,
                  (last_seen > now() - interval '3 minutes') as online from worker_nodes order by last_seen desc`),
    pool.query(`select
        count(*) filter (where status='pending')::int pending,
        count(*) filter (where status='approved')::int approved,
        count(*) filter (where status='removed')::int removed,
        count(*) filter (where status='pending' or (status='approved' and source='ai_scrape' and (last_confirmed_at is null or last_confirmed_at < now()-interval '7 days')))::int available
      from events`),
    pool.query(`select created_at, worker_id, venue, event_type, decision, model, reason from worker_log order by created_at desc limit 60`),
    pool.query(`select decision, count(*)::int n from worker_log group by decision`),
  ]);
  const q = queue.rows[0];
  const online = nodes.rows.filter((n) => n.online).length;
  const tallyMap = Object.fromEntries(tally.rows.map((r) => [r.decision, r.n]));
  const totalVerdicts = tally.rows.reduce((a, r) => a + r.n, 0);

  const Stat = ({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) => (
    <div className="border border-rule bg-paper-raised p-3 text-center">
      <div className={`font-display font-black text-3xl ${accent ? 'text-chile' : 'text-ink'}`}>{value}</div>
      <div className="font-stamp uppercase tracking-[0.1em] text-[10px] text-ink-soft mt-1">{label}</div>
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto px-5 py-8">
      <AdminNav active="/admin/workers" />
      <h1 className="font-display font-black text-3xl text-ink">Workers — the verification pipeline</h1>
      <p className="font-ui text-sm text-ink-soft mt-1 mb-6 max-w-2xl leading-relaxed">Remote AI workers pull unverified event suggestions, open each venue&apos;s website, and decide whether the event is real, fixing the day/time or rejecting it, so you don&apos;t have to. Below: which machines are connected, how much work is waiting, and every decision they&apos;ve made.</p>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        <Stat label="Online" value={online} accent={online > 0} />
        <Stat label="Work waiting" value={q.available} accent={q.available > 0} />
        <Stat label="Verdicts" value={totalVerdicts} />
        <Stat label="Approved" value={tallyMap.approve || 0} />
        <Stat label="Rejected" value={tallyMap.reject || 0} />
        <Stat label="Live events" value={q.approved} />
      </div>

      {/* Connected workers */}
      <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-2">Connected workers</h2>
      {nodes.rows.length === 0 ? (
        <p className="font-ui text-sm text-ink-soft mb-8">No workers have checked in yet. Start one on a box and it&apos;ll appear here within a minute.</p>
      ) : (
        <div className="overflow-x-auto mb-8">
          <table className="w-full font-ui text-sm">
            <thead><tr className="text-left border-b border-rule font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft">
              <th className="py-2">Machine</th><th>Status</th><th>Done</th><th>Errors</th><th>Last seen</th><th>First seen</th>
            </tr></thead>
            <tbody>
              {nodes.rows.map((n) => (
                <tr key={n.id} className="border-b border-rule/50">
                  <td className="py-2"><span className={`inline-block w-2 h-2 rounded-full mr-2 ${n.online ? 'bg-amber' : 'bg-rule'}`} />{n.id}</td>
                  <td className="text-ink-soft">{n.status || '—'}</td>
                  <td>{n.processed}</td>
                  <td className={n.errors > 0 ? 'text-oxblood' : ''}>{n.errors}</td>
                  <td className={n.online ? 'text-ink' : 'text-ink-soft'}>{ago(n.last_seen)}</td>
                  <td className="text-ink-soft">{ago(n.first_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Queue */}
      <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-2">Event queue</h2>
      <p className="font-ui text-sm text-ink mb-8">
        <span className="text-chile font-semibold">{q.available}</span> available to verify ·{' '}
        {q.pending} pending · {q.approved} approved/live · {q.removed} rejected
      </p>

      {/* Activity log */}
      <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-2">Activity log <span className="text-ink-soft/60">(latest 60)</span></h2>
      {recent.rows.length === 0 ? (
        <p className="font-ui text-sm text-ink-soft">No verdicts logged yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-ui text-sm">
            <thead><tr className="text-left border-b border-rule font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft">
              <th className="py-2">When</th><th>Worker</th><th>Spot</th><th>Type</th><th>Verdict</th><th>Model</th><th>Reason</th>
            </tr></thead>
            <tbody>
              {recent.rows.map((r, i) => (
                <tr key={i} className="border-b border-rule/40 align-top">
                  <td className="py-2 text-ink-soft whitespace-nowrap">{ago(r.created_at)}</td>
                  <td className="text-ink-soft whitespace-nowrap">{r.worker_id}</td>
                  <td className="text-ink">{r.venue}</td>
                  <td className="text-ink-soft">{r.event_type}</td>
                  <td><span className={`font-stamp uppercase tracking-[0.06em] text-[10px] px-1.5 py-0.5 ${DEC_STYLE[r.decision] || ''}`}>{r.decision}</span></td>
                  <td className="text-ink-soft text-xs whitespace-nowrap">{(r.model || '').split('/').pop()}</td>
                  <td className="text-ink-soft text-xs max-w-[16rem]">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
