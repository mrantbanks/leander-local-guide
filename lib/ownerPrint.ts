// Shared print templates for the owner leave-behinds (claim certificate + Owner Desk guide).
// One stylesheet so /print, /guide, and /packet (both, one print job) all stay consistent.

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const CSS = `
@page { size: Letter portrait; margin: 0.5in; }
:root{ --paper:#F4EFE6; --ink:#16130F; --red:#E03A1E; }
*{ box-sizing:border-box; } html,body{ margin:0; }
body{ font-family:Georgia, serif; color:var(--ink); background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.sheet{ width:7.5in; margin:0 auto; }
.bebas{ font-family:'Arial Narrow', Arial, sans-serif; text-transform:uppercase; letter-spacing:.06em; font-weight:700; }
.rule{ border:0; border-top:2px solid var(--ink); margin:12px 0; }
.masthead{ background:var(--red); color:var(--paper); border:2px solid var(--ink); padding:8px 14px; display:flex; justify-content:space-between; align-items:baseline; }
.masthead .wm{ font-size:28px; line-height:1; } .masthead .dl{ font-size:10px; letter-spacing:.12em; }
.stamp{ display:inline-block; border:2px solid var(--ink); padding:3px 10px; transform:rotate(-3deg); font-size:13px; margin:12px 0 4px; }
.headline{ font-size:30px; line-height:1.05; font-weight:800; margin:6px 0 2px; }
.subhead{ font-size:12px; font-style:italic; margin:0 0 8px; }
.verdict{ border:2px solid var(--ink); padding:10px 14px; }
.verdict .m{ font-size:13px; } .stars{ font-size:18px; letter-spacing:2px; }
.verdict blockquote{ font-style:italic; font-size:14px; line-height:1.45; margin:6px 0 0; }
.label{ font-size:12px; letter-spacing:.08em; margin:14px 0 6px; }
.cols{ display:flex; gap:0.3in; } .col{ width:3.6in; }
.qrbox{ background:#fff; padding:0.1in; border:2px solid var(--ink); }
.qrbox svg{ width:100%; height:100%; display:block; }
.scan{ font-size:14px; margin:6px 0 2px; } .fallback{ font-size:11px; line-height:1.45; }
.url{ font-size:14px; } .code{ font-size:16px; letter-spacing:.1em; }
ol.steps{ margin:0; padding-left:1.1em; font-size:11px; line-height:1.5; }
ul.manage{ margin:6px 0 0; padding-left:1.1em; font-size:11px; line-height:1.5; }
.records{ font-size:11px; line-height:1.9; } .small{ font-size:9px; font-style:italic; }
.blank{ display:inline-block; min-width:150px; border-bottom:1px solid var(--ink); }
.note{ min-height:0.45in; border-bottom:1px solid var(--ink); }
.footer{ font-size:9px; letter-spacing:.05em; text-align:center; margin-top:10px; }
.h1{ font-size:30px; font-weight:800; margin:10px 0 0; } .sub{ font-style:italic; font-size:13px; margin:2px 0 0; }
.findbox{ display:flex; gap:0.3in; align-items:center; border:2px solid var(--ink); padding:12px; margin-top:12px; }
.find h2{ font-size:13px; margin:0 0 4px; } .find p{ font-size:12px; line-height:1.5; margin:0; }
.gsteps{ margin-top:14px; }
.gstep{ display:flex; gap:12px; padding:9px 0; border-bottom:1px solid #d8cdb8; }
.gnum{ font-family:'Arial Narrow',Arial,sans-serif; font-weight:700; font-size:22px; color:var(--red); width:26px; flex:none; line-height:1; }
.gstep h3{ font-size:14px; margin:0 0 1px; } .gstep p{ font-size:12px; line-height:1.45; margin:0; color:#4a4239; }
.gnote{ font-size:11px; font-style:italic; color:#4a4239; margin-top:12px; }
.addrline{ font-size:9px; color:#888; text-align:center; margin-top:6px; }
@media print { .print-btn{ display:none; } .sheet{ margin:0; } }
`;

export type CertOpts = { name: string; meta: string; stars: string; quote: string; date: string; qrSvg: string; code: string; operator: string; addr: string };
export type GuideOpts = { name: string; qrSvg: string };

export function certBody(o: CertOpts): string {
  return `
  <div class="masthead"><div class="wm bebas">The Leander Local Guide</div><div class="dl bebas">Est. in Leander, TX · ${esc(o.date)}</div></div>
  <div class="stamp bebas">★ Featured Listing · Verified Local ★</div>
  <h1 class="headline">You made the Guide, ${esc(o.name)}.</h1>
  <p class="subhead">Somebody's got to tell people where the good stuff is. Turns out, it's you.</p>
  <div class="verdict">
    <div class="m bebas">${esc(o.meta)}</div>
    <div><span class="stars">${o.stars}</span> &nbsp;<span class="bebas" style="font-size:12px;">The Local's Verdict</span></div>
    <blockquote>"${esc(o.quote)}" — Anthony</blockquote>
  </div>
  <hr class="rule"><div class="label bebas">Claim your listing — free</div>
  <div class="cols">
    <div class="col">
      <div class="qrbox" style="width:1.6in;height:1.6in;">${o.qrSvg}</div>
      <div class="scan bebas">Scan to claim</div>
      <div class="fallback">Point your phone camera at the square. That's it.<br><br>
        Camera won't cooperate? Go to:<br><span class="url bebas">leanderlocalguide.com/claim</span><br>
        Claim code: <span class="code bebas">${esc(o.code)}</span></div>
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
        <li>Post a <b>Locals Only</b> deal — locals print a ticket to show you</li>
        <li>Your "Verified Local" mark</li>
      </ul>
    </div>
  </div>
  <hr class="rule">
  <div class="records"><div class="bebas" style="font-size:12px;">For the record &nbsp;<span class="small">(keep this page)</span></div>
    Claimed with: <span class="blank"></span> &nbsp; &#9744; Email &nbsp; &#9744; Google<br>
    Date claimed: <span class="blank" style="min-width:90px;"></span> &nbsp; Verified by: ${esc(o.operator)}<br>
    <span class="small">No passwords here, ever. Your login is your own email or Google — we never see it, never write it down. That's on purpose.</span>
  </div>
  <div class="bebas" style="font-size:11px; margin-top:8px;">A line from Anthony:</div>
  <div class="note"></div>
  <div class="footer bebas">leanderlocalguide.com · hello@leanderlocalguide.com · Written by somebody who actually ate here.</div>
  <p class="addrline">Address on file: ${esc(o.addr)} · This code works ~120 days · Reprinting voids this one.</p>`;
}

export function guideBody(o: GuideOpts): string {
  return `
  <div class="masthead"><div class="wm bebas">The Leander Local Guide</div><div class="dl bebas">Owner Desk · Quick Guide</div></div>
  <h1 class="h1">Running your page, ${esc(o.name)}.</h1>
  <p class="sub">You claimed it. Here's everything you can do, plain and simple. It's all free.</p>
  <div class="findbox">
    <div class="qrbox" style="width:1.4in;height:1.4in;flex:none;">${o.qrSvg}</div>
    <div class="find">
      <h2 class="bebas">Get to your desk</h2>
      <p>Scan this, or go to <span class="url bebas">leanderlocalguide.com/owner</span>.<br>
      Sign in with the <b>same Google or email you claimed with</b> — no password. You'll land right on your desk.</p>
    </div>
  </div>
  <div class="gsteps">
    <div class="gstep"><div class="gnum">1</div><div><h3>Fix your details</h3><p>Hours, phone, website, menu &amp; order links. If Google has it wrong, set it here and yours wins everywhere on your page.</p></div></div>
    <div class="gstep"><div class="gnum">2</div><div><h3>Say hi from the owner</h3><p>Add a short "From the Owner" note — "family-run since 2019," the dish to get, whatever. It shows in its own spot on your page.</p></div></div>
    <div class="gstep"><div class="gnum">3</div><div><h3>Post a Locals Only deal</h3><p>Pick a deal (or write your own), preview the ticket, and post it. Leander locals get a printable ticket to show you. Honor system — you decide what to give. Run as many as you like.</p></div></div>
    <div class="gstep"><div class="gnum">4</div><div><h3>See who's watching</h3><p>Your desk shows how many locals want to try you and have vouched for you. Good week to put a deal up? Now you'll know.</p></div></div>
  </div>
  <p class="gnote">One thing you can't touch: Anthony's review and verdict. That stays independent — and that's exactly why folks trust the page your name is on.</p>
  <div class="footer bebas">leanderlocalguide.com · hello@leanderlocalguide.com · Written by somebody who actually ate here.</div>`;
}

export function printShell(title: string, bodies: string[]): string {
  const sheets = bodies.map((b, i) => `<div class="sheet"${i > 0 ? ' style="page-break-before:always;"' : ''}>${b}</div>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>
<div class="print-btn" style="text-align:center;margin:14px 0;"><button onclick="window.print()" style="font:700 14px Arial;padding:8px 20px;cursor:pointer;">Print ${bodies.length > 1 ? 'both sheets' : 'this sheet'}</button></div>
${sheets}
</body></html>`;
}
