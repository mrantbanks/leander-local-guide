import { auth } from '@/auth';
import { pool } from '@/lib/db';
import { mintClaimToken } from '@/lib/owner';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Admin-only: mints a fresh claim token and returns a printable "Featured / Verified Local"
// certificate (QR + short code) to hand to the owner in person. No password anywhere.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) return new Response('Forbidden', { status: 403 });
  const { slug } = await params;
  const { rows } = await pool.query(
    `select id, name, primary_category cat, address_formatted, cuisines, ratings, editorial from restaurants where slug = $1`, [slug]);
  const r = rows[0];
  if (!r) return new Response('Not found', { status: 404 });

  const { raw, code } = await mintClaimToken(r.id, session!.user!.email!);
  const url = `https://leanderlocalguide.com/claim/${raw}`;
  const qr = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'Q', margin: 1, color: { dark: '#000000', light: '#ffffff' } });

  const rating = Math.round(r.ratings?.google?.rating || 0);
  const stars = '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
  const meta = [r.cat, (r.cuisines || [])[0], 'Leander, TX'].filter(Boolean).join(' · ');
  const quote = r.editorial?.hook || 'A Leander spot worth knowing about.';
  const addr = (r.address_formatted || '').replace(/,?\s*USA$/, '');
  const date = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Featured Listing — ${esc(r.name)}</title>
<style>
@page { size: Letter portrait; margin: 0.5in; }
:root{ --paper:#F4EFE6; --ink:#16130F; --red:#E03A1E; --amber:#F2A516; }
*{ box-sizing:border-box; } html,body{ margin:0; }
body{ font-family:Georgia, 'Times New Roman', serif; color:var(--ink); background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.sheet{ width:7.5in; margin:0 auto; }
.bebas{ font-family:'Arial Narrow', Arial, sans-serif; text-transform:uppercase; letter-spacing:.06em; font-weight:700; }
.rule{ border:0; border-top:2px solid var(--ink); margin:12px 0; }
.masthead{ background:var(--red); color:var(--paper); border:2px solid var(--ink); padding:8px 14px; display:flex; justify-content:space-between; align-items:baseline; }
.masthead .wm{ font-size:30px; line-height:1; } .masthead .dl{ font-size:10px; letter-spacing:.12em; }
.stamp{ display:inline-block; border:2px solid var(--ink); padding:3px 10px; transform:rotate(-3deg); font-size:13px; margin:12px 0 4px; }
.headline{ font-size:30px; line-height:1.05; font-weight:800; margin:6px 0 2px; }
.subhead{ font-size:12px; font-style:italic; margin:0 0 8px; }
.verdict{ border:2px solid var(--ink); padding:10px 14px; }
.verdict .m{ font-size:13px; } .stars{ font-size:18px; letter-spacing:2px; }
.verdict blockquote{ font-style:italic; font-size:14px; line-height:1.45; margin:6px 0 0; }
.label{ font-size:12px; letter-spacing:.08em; margin:14px 0 6px; }
.cols{ display:flex; gap:0.3in; } .col{ width:3.6in; }
.qrbox{ width:1.6in; height:1.6in; background:#fff; padding:0.1in; border:2px solid var(--ink); }
.qrbox svg{ width:100%; height:100%; display:block; }
.scan{ font-size:14px; margin:6px 0 2px; } .fallback{ font-size:11px; line-height:1.45; }
.url{ font-size:14px; } .code{ font-size:16px; letter-spacing:.1em; }
ol.steps{ margin:0; padding-left:1.1em; font-size:11px; line-height:1.5; }
ul.manage{ margin:6px 0 0; padding-left:1.1em; font-size:11px; line-height:1.5; }
.records{ font-size:11px; line-height:1.9; } .small{ font-size:9px; font-style:italic; }
.blank{ display:inline-block; min-width:150px; border-bottom:1px solid var(--ink); }
.note{ font-size:14px; min-height:0.45in; border-bottom:1px solid var(--ink); }
.footer{ font-size:9px; letter-spacing:.05em; text-align:center; margin-top:10px; }
.print-btn{ text-align:center; margin:14px 0; } @media print { .print-btn{ display:none; } .sheet{ margin:0; } }
</style></head><body>
<div class="print-btn"><button onclick="window.print()" style="font:700 14px Arial; padding:8px 20px; cursor:pointer;">Print this sheet</button></div>
<div class="sheet">
  <div class="masthead"><div class="wm bebas">The Leander Local Guide</div><div class="dl bebas">Est. in Leander, TX · ${esc(date)}</div></div>
  <div class="stamp bebas">★ Featured Listing · Verified Local ★</div>
  <h1 class="headline">You made the Guide, ${esc(r.name)}.</h1>
  <p class="subhead">Somebody's got to tell people where the good stuff is. Turns out, it's you.</p>
  <div class="verdict">
    <div class="m bebas">${esc(meta)}</div>
    <div><span class="stars">${stars}</span> &nbsp;<span class="bebas" style="font-size:12px;">The Local's Verdict</span></div>
    <blockquote>"${esc(quote)}" — Anthony</blockquote>
  </div>
  <hr class="rule"><div class="label bebas">Claim your listing — free</div>
  <div class="cols">
    <div class="col">
      <div class="qrbox">${qr}</div>
      <div class="scan bebas">Scan to claim</div>
      <div class="fallback">Point your phone camera at the square. That's it.<br><br>
        Camera won't cooperate? Go to:<br><span class="url bebas">leanderlocalguide.com/claim</span><br>
        Claim code: <span class="code bebas">${esc(code)}</span></div>
    </div>
    <div class="col">
      <div class="bebas" style="font-size:12px;">Claim it in 60 seconds</div>
      <ol class="steps">
        <li>Scan the code (or type the link).</li>
        <li>Sign in with the <b>email or Google account you actually check</b> — that's your key. No password to remember, nothing to lose.</li>
        <li>Confirm it's you. You're verified. Done before your coffee's cold.</li>
      </ol>
      <div class="bebas" style="font-size:12px; margin-top:8px;">What's yours to run</div>
      <ul class="manage">
        <li>Hours, phone, address — keep 'em straight</li>
        <li>Your menu &amp; order links</li>
        <li>A note in your own voice</li>
        <li>Your "Verified Local" mark</li>
      </ul>
    </div>
  </div>
  <hr class="rule">
  <div class="records"><div class="bebas" style="font-size:12px;">For the record &nbsp;<span class="small">(keep this page)</span></div>
    Claimed with: <span class="blank"></span> &nbsp; &#9744; Email &nbsp; &#9744; Google<br>
    Date claimed: <span class="blank" style="min-width:90px;"></span> &nbsp; Verified by: ${esc(session!.user!.name || 'Anthony')}<br>
    <span class="small">No passwords here, ever. Your login is your own email or Google — we never see it, never write it down. That's on purpose.</span>
  </div>
  <div class="bebas" style="font-size:11px; margin-top:8px;">A line from Anthony:</div>
  <div class="note"></div>
  <div class="footer bebas">leanderlocalguide.com · hello@leanderlocalguide.com · Written by somebody who actually ate here.</div>
  <p style="font-size:9px; color:#888; text-align:center; margin-top:6px;">Address on file: ${esc(addr)} · This code works ~120 days · Reprinting voids this one.</p>
</div></body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' } });
}
