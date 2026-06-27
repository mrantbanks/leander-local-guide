import { pool } from '@/lib/db';
import { screenSubmission } from '@/lib/moderate';

// AI moderation pass: claims pending reviews/tips, hard-rejects spam via the guardrail, then has
// Gemini decide if each is a genuine, on-topic submission about THIS restaurant. Approves the good
// ones, rejects spam/abuse/off-topic, leaves genuinely-ambiguous ones pending for a human.

type Item = { id: number; body: string; stars: number | null; venue: string; kind: 'review' | 'tip' };

async function judge(it: Item, key: string): Promise<{ decision: 'approve' | 'reject' | 'unsure'; reason: string }> {
  const prompt = `You moderate user-submitted content for a local restaurant guide. You are filtering spam and abuse, NOT fact-checking. Be decisive. Decide whether to PUBLISH this ${it.kind} for the restaurant "${it.venue}".
APPROVE if it reads like a real person's genuine experience, opinion, or tip about a local food spot, EVEN IF you cannot verify specific details (the menu, the setup, a food truck, a vendor, "the guy on the deck"), and even if it is short, casual, vague, or only refers to the place as "this place" / "here". Approve honest negative reviews too. When in doubt and it looks human and on-topic, APPROVE.
REJECT only if it is clearly spam or an ad, contains links or contact info, is hateful or harassing, is pure gibberish, or is obviously not about food or a restaurant at all.
Use "unsure" RARELY: only when you genuinely cannot tell if it is a planted fake, or cannot tell whether it concerns a food business at all. Do NOT use "unsure" merely because you cannot verify a detail or the venue's exact setup.
${it.kind === 'review' && it.stars ? `The user gave ${it.stars} stars.` : ''}
SUBMISSION: """${(it.body || '').slice(0, 1500)}"""
Return ONLY minified JSON: {"decision":"approve"|"reject"|"unsure","reason":"<short reason>"}`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } }),
    });
    const j = await r.json();
    const t = j?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text)?.text;
    const out = JSON.parse(t);
    const d = ['approve', 'reject', 'unsure'].includes(out?.decision) ? out.decision : 'unsure';
    return { decision: d, reason: String(out?.reason || '').slice(0, 300) };
  } catch { return { decision: 'unsure', reason: 'AI check failed' }; }
}

async function claim(kind: 'review' | 'tip'): Promise<Item[]> {
  const tbl = kind === 'review' ? 'reviews' : 'tips';
  const starsCol = kind === 'review' ? 'u.stars' : 'null::int stars';
  const { rows } = await pool.query(
    `with c as (
        select s.id from ${tbl} s
        where s.status='pending' and (s.worker_checked_at is null or s.worker_checked_at < now() - interval '20 hours')
        order by s.created_at limit 30 for update skip locked
     ), u as (update ${tbl} set worker_checked_at=now() where id in (select id from c) returning *)
     select u.id, u.body, ${starsCol}, r.name venue from u join restaurants r on r.id = u.place_id`);
  return rows.map((x) => ({ id: x.id, body: x.body, stars: x.stars, venue: x.venue, kind }));
}

// Start a moderation pass now (overlap-guarded, idle-aware), running in the background. Called by
// the cron AND fired the moment a review/tip is submitted, so nothing waits for the next tick.
export async function kickoffModeration(): Promise<{ started?: boolean; idle?: boolean; skipped?: string; runId?: number }> {
  const pend = await pool.query("select (select count(*) from reviews where status='pending') + (select count(*) from tips where status='pending') n");
  if (Number(pend.rows[0].n) === 0) return { idle: true };
  const running = await pool.query("select id from scraper_runs where kind='moderation' and status='running' and started_at > now() - interval '30 minutes' limit 1");
  if (running.rows[0]) return { skipped: 'already running', runId: running.rows[0].id };
  const { rows } = await pool.query("insert into scraper_runs(kind, status) values('moderation','running') returning id");
  const runId = rows[0].id;
  moderateSubmissions(runId)
    .then((r) => pool.query("update scraper_runs set finished_at=now(), status='done', checked=$2, found=$3, note=$4 where id=$1", [runId, r.checked, r.approved, `${r.approved} approved, ${r.rejected} rejected, ${r.unsure} left for human`]))
    .catch((e) => pool.query("update scraper_runs set finished_at=now(), status='error', note=$2 where id=$1", [runId, String(e).slice(0, 300)]));
  return { started: true, runId };
}

export async function moderateSubmissions(runId: number): Promise<{ checked: number; approved: number; rejected: number; unsure: number }> {
  const key = process.env.GEMINI_API_KEY || '';
  const items = [...(await claim('review')), ...(await claim('tip'))];
  let approved = 0, rejected = 0, unsure = 0;
  for (const it of items) {
    const tbl = it.kind === 'review' ? 'reviews' : 'tips';
    const screen = screenSubmission(it.body);
    let decision: 'approve' | 'reject' | 'unsure', reason: string;
    if (screen.hardReject) {
      decision = 'reject'; reason = `guardrail: ${screen.reasons.join(', ')}`;
    } else {
      const j = await judge(it, key);
      decision = j.decision; reason = j.reason;
      if (decision === 'approve' && screen.reasons.length) { decision = 'unsure'; reason = `soft flag: ${screen.reasons.join(', ')}`; } // never auto-approve a flagged one
    }
    if (decision === 'approve') { await pool.query(`update ${tbl} set status='approved', worker_note=$2 where id=$1`, [it.id, reason]); approved++; }
    else if (decision === 'reject') { await pool.query(`update ${tbl} set status='removed', worker_note=$2 where id=$1`, [it.id, reason]); rejected++; }
    else { await pool.query(`update ${tbl} set worker_note=$2 where id=$1`, [it.id, reason]); unsure++; }
    await pool.query(
      'insert into worker_log (worker_id, event_id, venue, event_type, decision, model, reason) values ($1, null, $2, $3, $4, $5, $6)',
      ['ai-moderation', String(it.venue).slice(0, 120), it.kind, decision, 'gemini-2.5-flash', reason.slice(0, 500)]);
    if ((approved + rejected + unsure) % 8 === 0) await pool.query('update scraper_runs set checked=$2, found=$3 where id=$1', [runId, items.length, approved]).catch(() => {});
  }
  return { checked: items.length, approved, rejected, unsure };
}
