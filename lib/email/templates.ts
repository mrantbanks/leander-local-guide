// Shared email layout (zine aesthetic, inline styles for client compatibility). No em dashes.
export const BASE = 'https://leanderlocalguide.com';

export function wrap(inner: string, unsubToken?: string): string {
  const unsub = unsubToken ? `${BASE}/unsubscribe?t=${unsubToken}` : BASE;
  return `<!doctype html><html><body style="margin:0;background:#f4efe6;">
  <div style="max-width:560px;margin:0 auto;padding:26px 22px;font-family:Georgia,'Times New Roman',serif;color:#221d18;">
    <div style="border-bottom:2px solid #221d18;padding-bottom:9px;margin-bottom:18px;">
      <a href="${BASE}" style="text-decoration:none;color:#221d18;font-weight:800;font-size:21px;letter-spacing:-0.5px;">The Leander Local Guide</a>
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9a3324;margin-top:3px;font-family:Arial,sans-serif;">Anthony Martinez · Leander, TX</div>
    </div>
    ${inner}
    <div style="border-top:1px solid #d8cfbf;margin-top:26px;padding-top:13px;font-size:11px;color:#8a8076;font-family:Arial,sans-serif;line-height:1.6;">
      You're getting this because you signed up at leanderlocalguide.com.<br>
      <a href="${unsub}" style="color:#9a3324;">Unsubscribe</a> &nbsp;·&nbsp; Leander, Texas
    </div>
  </div></body></html>`;
}

export function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#9a3324;color:#f4efe6;text-decoration:none;padding:11px 20px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin:10px 0;">${label}</a>`;
}

export function p(text: string): string {
  return `<p style="font-size:16px;line-height:1.7;margin:0 0 14px;">${text}</p>`;
}

export function confirmEmail(token: string): { subject: string; html: string } {
  const link = `${BASE}/subscribe/confirm?t=${token}`;
  return {
    subject: "Confirm your spot on the Leander Local list",
    html: wrap(
      `<p style="font-size:19px;line-height:1.5;margin:0 0 12px;font-weight:bold;">Check your inbox, there's a door to open.</p>` +
      p("Click below to confirm and you're in for real. The first thing you'll get is my honest map of where to start eating in Leander.") +
      btn(link, 'Confirm and let me in') +
      `<p style="font-size:12px;color:#8a8076;font-family:Arial,sans-serif;">If the button doesn't work, paste this in your browser:<br>${link}</p>`
    ),
  };
}
