import Link from 'next/link';
import { pool } from '@/lib/db';
import { auth, signIn, signOut } from '@/auth';
import StatTile from '@/components/StatTile';

export const dynamic = 'force-dynamic';

type AdminUser = { email?: string; name?: string; isAdmin?: boolean };

// Module scope, like StatTile: a component declared inside render is a new component type on every
// render, so React rebuilds it instead of reconciling it. It closes over nothing.
function Card({ href, title, desc, meta }: { href: string; title: string; desc: string; meta?: string }) {
  return (
    <Link href={href} className="group block border border-rule bg-paper-raised p-5 hover:border-ink transition-colors">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display font-bold text-xl text-ink group-hover:text-oxblood transition-colors">{title}</h2>
        {meta && <span className="font-stamp uppercase tracking-[0.08em] text-xs text-chile">{meta}</span>}
      </div>
      <p className="font-ui text-sm text-ink-soft mt-1.5 leading-relaxed">{desc}</p>
    </Link>
  );
}

export default async function AdminPage() {
  const session = await auth();
  const user = session?.user as AdminUser | undefined;

  if (!user) {
    return (
      <main className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="font-display font-black text-4xl text-ink mb-3">Newsroom</h1>
        <p className="font-ui text-sm text-ink-soft mb-8">Sign in to manage the guide.</p>
        <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/admin' }); }}>
          <button className="font-stamp uppercase tracking-[0.12em] text-base bg-ink text-paper px-7 py-3 hover:bg-chile transition-colors">Sign in with Google</button>
        </form>
      </main>
    );
  }
  if (!user.isAdmin) {
    return (
      <main className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="font-display font-black text-3xl text-ink mb-2">Not on the list</h1>
        <p className="font-ui text-sm text-ink-soft mb-6">{user.email} isn&apos;t an admin.</p>
        <form action={async () => { 'use server'; await signOut({ redirectTo: '/admin' }); }}>
          <button className="font-stamp uppercase tracking-[0.1em] text-sm text-chile">Sign out</button>
        </form>
      </main>
    );
  }

  const { rows } = await pool.query(`select
    (select count(*) from restaurants)::int spots,
    (select count(*) from restaurants where (editorial->>'visited')::bool)::int visited,
    (select count(*) from photos where status='pending')::int p_photos,
    (select count(*) from tips where status='pending')::int p_tips,
    (select count(*) from reviews where status='pending')::int p_reviews,
    (select count(*) from claims where status='pending')::int p_claims,
    (select count(*) from events where status='pending')::int p_events,
    (select count(*) from worker_nodes where last_seen > now()-interval '3 minutes')::int workers_online,
    (select count(*) from events where status='approved' and (expires_at is null or expires_at>now()))::int live_events`);
  const s = rows[0];
  const pendingTotal = s.p_photos + s.p_tips + s.p_reviews + s.p_claims + s.p_events;


  return (
    <main className="max-w-5xl mx-auto px-5 py-8">
      <p className="font-ui text-xs text-ink-soft mb-5">Signed in as {user.email}. This is the control room for The Leander Local Guide — everything the public sees, plus the machines that keep it fresh.</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <StatTile value={s.spots} label="Spots" />
        <StatTile value={pendingTotal} label="Awaiting review" accent={pendingTotal > 0} />
        <StatTile value={s.workers_online} label="Workers online" accent={s.workers_online > 0} />
        <StatTile value={s.live_events} label="Live events" />
        <StatTile value={s.visited} label="Anthony visited" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card href="/admin/spots" title="Spots & Reviews" meta={`${s.spots} spots`}
          desc="Edit Anthony's verdict, review, what-to-order, gotcha, photos, happy hour, badges, and recurring events for each spot. Changes go live right away." />
        <Card href="/admin/moderation" title="Moderation" meta={pendingTotal > 0 ? `${pendingTotal} waiting` : 'clear'}
          desc="Approve or reject things SUBMITTED by visitors and the event scraper before they appear in public. Nothing here is live until you approve it: photos, tips, star reviews, owner claims, and event suggestions." />
        <Card href="/admin/workers" title="Workers (the pipeline)" meta={`${s.workers_online} online`}
          desc="The remote AI workers that auto-verify scraped events against each venue's website, so you don't have to. See which machines are connected, what work is waiting, and every decision they've made." />
        <Card href="/whats-on" title="What's On (public)" meta={`${s.live_events} live`}
          desc="The live public events calendar — trivia, karaoke, live music and more for tonight and the week. This is what visitors see." />
        <Card href="/admin/growth" title="Growth Playbook" meta="the plan"
          desc="What to do next: the goal (10 real locals using it), the Facebook-group launch checklist, what NOT to waste time on, the money plan, and the hardening gates." />
      </div>
    </main>
  );
}
