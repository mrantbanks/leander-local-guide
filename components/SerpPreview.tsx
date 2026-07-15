'use client';

// A faithful-enough Google search result. Rendered white, in Arial, with Google's real colors and
// column widths, so it reads like the SERP no matter what the admin theme is. Truncation is done by
// the browser (CSS line-clamp / ellipsis at Google's actual pixel widths), which is more honest than
// counting characters: Google truncates on rendered pixels too.

type Props = {
  device: 'desktop' | 'mobile';
  siteName: string;
  breadcrumb: string;
  title: string;
  description: string;
  rating?: { value: number; count: number } | null;
};

const G = { blue: '#1a0dab', ink: '#202124', url: '#4d5156', star: '#e7711b', starOff: '#dadce0' };

function Stars({ value }: { value: number }) {
  const n = Math.round(value);
  return (
    <span style={{ letterSpacing: '0.5px' }} aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= n ? G.star : G.starOff, fontSize: 13 }}>★</span>
      ))}
    </span>
  );
}

export default function SerpPreview({ device, siteName, breadcrumb, title, description, rating }: Props) {
  const w = device === 'desktop' ? 600 : 340;
  const titleSize = device === 'desktop' ? 20 : 18;
  const descLines = device === 'desktop' ? 2 : 3;
  const font = 'arial, "Helvetica Neue", Helvetica, sans-serif';

  return (
    <div
      style={{
        fontFamily: font, background: '#fff', borderRadius: device === 'mobile' ? 8 : 4,
        border: '1px solid #ebebeb', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: device === 'mobile' ? '14px 16px' : '14px 16px', maxWidth: w + 32, width: '100%',
      }}
    >
      {/* Identity line: favicon + site name + breadcrumb URL */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid #ecedef', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: '#f1f3f4' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.ico" alt="" width={16} height={16} style={{ width: 16, height: 16, objectFit: 'contain' }} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, color: G.ink, lineHeight: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: w - 40 }}>{siteName}</span>
          <span style={{ display: 'block', fontSize: 12, color: G.url, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: w - 40 }}>{breadcrumb}</span>
        </span>
      </div>

      {/* Title link */}
      <div
        style={{
          color: G.blue, fontSize: titleSize, lineHeight: device === 'desktop' ? '26px' : '24px',
          maxWidth: w, ...(device === 'desktop'
            ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
            : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
        }}
      >
        {title || 'Untitled'}
      </div>

      {/* Rating stars (only when eligible) */}
      {rating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <Stars value={rating.value} />
          <span style={{ fontSize: 13, color: G.url }}>Rating: {rating.value} · {rating.count} review{rating.count === 1 ? '' : 's'}</span>
        </div>
      )}

      {/* Description snippet */}
      <div
        style={{
          color: G.url, fontSize: 14, lineHeight: '20px', marginTop: 4, maxWidth: w,
          display: '-webkit-box', WebkitLineClamp: descLines, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}
      >
        {description || <span style={{ fontStyle: 'italic', color: '#9aa0a6' }}>No description. Google will write its own from the page.</span>}
      </div>
    </div>
  );
}
