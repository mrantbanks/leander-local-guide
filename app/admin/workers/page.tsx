import Link from 'next/link';
import { pool } from '@/lib/db';
import { auth } from '@/auth';
import { approveReview, rejectReview, approveTip, rejectTip } from '@/app/actions';

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
  const [nodes, queue, recent, tally, scrape, coverage, mod, subs, pendingQ] = await Promise.all([
    // Legacy workers heartbeat every 60s (3-min window). Fleet workers check in by
    // claiming — up to ~2.5 min apart when idle, longer while chewing a browser job —
    // so they get a wider window.
    pool.query(`select id, last_seen, first_seen, status, processed, errors,
                  (last_seen > now() - case when status = 'fleet-worker'
                     then interval '12 minutes' else interval '3 minutes' end) as online
                from worker_nodes order by last_seen desc`),
    pool.query(`select
        count(*) filter (where status='pending')::int pending,
        count(*) filter (where status='approved')::int approved,
        count(*) filter (where status='removed')::int removed,
        count(*) filter (where status='pending' or (status='approved' and source='ai_scrape' and (last_confirmed_at is null or last_confirmed_at < now()-interval '7 days')))::int available
      from events`),
    pool.query(`select created_at, worker_id, venue, event_type, decision, model, reason from worker_log order by created_at desc limit 60`),
    pool.query(`select decision, count(*)::int n from worker_log group by decision`),
    pool.query(`select started_at, finished_at, checked, found, status, note from scraper_runs where kind='happy_hours' order by started_at desc limit 1`),
    pool.query(`select count(*) filter (where coalesce(attributes->>'website','')<>'')::int sites,
                       count(*) filter (where happy_hour_checked_at is not null)::int ever_checked,
                       count(*) filter (where coalesce(happy_hour,'')<>'')::int with_hh,
                       max(happy_hour_checked_at) last_site_check from restaurants`),
    pool.query(`select started_at, finished_at, checked, found, status, note from scraper_runs where kind='moderation' order by started_at desc limit 1`),
    pool.query(`select (select count(*) from reviews where status='pending')::int pend_rev,
                       (select count(*) from tips where status='pending')::int pend_tip,
                       (select count(*) from reviews where status='approved')::int ok_rev,
                       (select count(*) from tips where status='approved')::int ok_tip,
                       (select count(*) from worker_log where worker_id='ai-moderation')::int mod_actions`),
    pool.query(`select 'review' kind, rv.id, rv.stars::text extra, rv.body, rv.worker_note, r.name venue
                from reviews rv join restaurants r on r.id=rv.place_id where rv.status='pending'
                union all
                select 'tip' kind, t.id, null, t.body, t.worker_note, r.name
                from tips t join restaurants r on r.id=t.place_id where t.status='pending'
                order by 1`),
  ]);
  const queueItems = pendingQ.rows as { kind: string; id: number; extra: string | null; body: string; worker_note: string | null; venue: string }[];
  const md = mod.rows[0];
  const sb = subs.rows[0];
  const q = queue.rows[0];
  const sc = scrape.rows[0];
  const cov = coverage.rows[0];
  // weekly schedule: Mondays ~05:00 CT
  const now = new Date();
  const daysUntilMon = ((1 - now.getDay() + 7) % 7) || 7;
  const nextRun = new Date(now); nextRun.setDate(now.getDate() + daysUntilMon); nextRun.setHours(5, 0, 0, 0);
  const fmt = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric' }).format(d);
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

      {/* Happy-hour scraper */}
      <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-2">Happy-hour scraper</h2>
      <div className="border border-rule bg-paper-raised p-4 mb-8 font-ui text-sm">
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5">
          <div className="flex justify-between"><span className="text-ink-soft">Last ran</span><span className="text-ink">{sc ? `${ago(sc.started_at)}${sc.status === 'running' ? ' · running now' : sc.finished_at ? ` · ${Math.max(1, Math.round((new Date(sc.finished_at).getTime() - new Date(sc.started_at).getTime()) / 1000))}s` : ''}` : 'never'}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Next run</span><span className="text-ink">{fmt(nextRun)} CT</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Last result</span><span className="text-ink">{sc ? (sc.status === 'error' ? <span className="text-oxblood">error: {sc.note}</span> : sc.note || `checked ${sc.checked}, found ${sc.found}`) : '—'}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Schedule</span><span className="text-ink">Weekly · Mondays ~5 AM CT</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Sites checked (all-time)</span><span className="text-ink">{cov.ever_checked} / {cov.sites} with websites</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Happy hours live</span><span className="text-ink">{cov.with_hh}</span></div>
        </div>
        <p className="text-ink-soft text-xs mt-3 pt-3 border-t border-rule/60">Reads each restaurant&apos;s website, has AI pull the happy hour (only kept if it has a real time), verifies existing ones, and finds new ones. Owner-set happy hours are never overwritten.</p>
      </div>

      {/* Submission moderation */}
      <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink-soft mb-2">Submission moderation</h2>
      <div className="border border-rule bg-paper-raised p-4 mb-8 font-ui text-sm">
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5">
          <div className="flex justify-between"><span className="text-ink-soft">Awaiting review</span><span className={(sb.pend_rev + sb.pend_tip) > 0 ? 'text-chile font-semibold' : 'text-ink'}>{sb.pend_rev} reviews · {sb.pend_tip} tips</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Last ran</span><span className="text-ink">{md ? `${ago(md.started_at)}${md.status === 'running' ? ' · running' : ''}` : 'never'}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Published (live)</span><span className="text-ink">{sb.ok_rev} reviews · {sb.ok_tip} tips</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Last result</span><span className="text-ink">{md ? (md.status === 'error' ? <span className="text-oxblood">error</span> : md.note || '—') : '—'}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">AI decisions made</span><span className="text-ink">{sb.mod_actions}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Schedule</span><span className="text-ink">Every 15 min, when something is waiting</span></div>
        </div>
        <p className="text-ink-soft text-xs mt-3 pt-3 border-t border-rule/60">A hard guardrail blocks links, contact info, profanity, and spam at submission. The AI then checks each pending review/tip is a genuine, on-topic take on the restaurant: it approves the real ones, rejects spam/abuse/off-topic, and leaves anything borderline here for you. It never auto-approves something the guardrail flagged.</p>

        {queueItems.length > 0 && (
          <div className="mt-4 pt-3 border-t border-rule/60 space-y-3">
            <p className="font-stamp uppercase tracking-[0.1em] text-xs text-oxblood">Needs your call ({queueItems.length})</p>
            {queueItems.map((it) => (
              <div key={`${it.kind}-${it.id}`} className="border border-rule rounded-sm p-3 bg-paper">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-stamp uppercase tracking-[0.06em] text-[10px] bg-ink text-paper px-1.5 py-0.5 rounded-sm">{it.kind}</span>
                  <span className="font-ui text-xs text-ink-soft">{it.venue}{it.extra ? ` · ${it.extra}★` : ''}</span>
                </div>
                <p className="font-ui text-sm text-ink">{it.body}</p>
                {it.worker_note ? <p className="font-ui text-xs text-ink-soft mt-1 italic">AI: {it.worker_note}</p> : null}
                <div className="flex gap-2 mt-2">
                  <form action={async () => { 'use server'; if (it.kind === 'review') await approveReview(it.id); else await approveTip(it.id); }}>
                    <button className="font-stamp uppercase tracking-[0.08em] text-xs bg-amber text-ink px-3 py-1 rounded-sm hover:opacity-80">Approve</button>
                  </form>
                  <form action={async () => { 'use server'; if (it.kind === 'review') await rejectReview(it.id); else await rejectTip(it.id); }}>
                    <button className="font-stamp uppercase tracking-[0.08em] text-xs border border-oxblood text-oxblood px-3 py-1 rounded-sm hover:bg-oxblood hover:text-paper">Reject</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
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
