import type { Sky } from '@/lib/sky';

/**
 * The sky over Leander, bled into the top right corner of the masthead.
 *
 * It used to be a bordered box, and a bordered box in the corner of a newspaper masthead is a
 * WIDGET: it sits on the page rather than being part of it. So there is no box now. There is a soft
 * radial wash coming in from the corner, tinted by what the sky is actually doing, with the sun or
 * moon floating inside it and the masthead's own type reading straight through. The colour is the
 * point: a clear night pulls a deep indigo into the corner of the cream paper, a storm pulls slate,
 * and the golden hour genuinely glows, because sunrise and sunset come from Open-Meteo for THIS
 * date rather than a hardcoded hour.
 *
 * Everything here is decoration over the real headline, so it is aria-hidden and pointer-events-none.
 * The temperature and the moon phase are announced once, in text, by the caption underneath.
 */

// The wash. Two stops, from a tinted corner out to nothing, so it dissolves into the paper.
function washFor(sky: Sky): string {
  const { part, condition } = sky;
  const storm = condition === 'storm';
  const grey = condition === 'cloudy' || condition === 'fog' || condition === 'rain' || condition === 'snow';

  if (part === 'night') {
    // Deep indigo, not black: a night sky over a cream page should feel like ink diluted in water.
    return storm
      ? 'radial-gradient(95% 165% at 100% 0%, rgba(26,29,45,0.95) 0%, rgba(26,29,45,0.7) 26%, rgba(244,239,230,0) 62%)'
      : grey
        ? 'radial-gradient(95% 165% at 100% 0%, rgba(32,36,48,0.9) 0%, rgba(32,36,48,0.58) 28%, rgba(244,239,230,0) 64%)'
        : 'radial-gradient(95% 165% at 100% 0%, rgba(20,24,44,0.96) 0%, rgba(28,32,58,0.64) 28%, rgba(244,239,230,0) 64%)';
  }
  if (part === 'dawn' || part === 'dusk') {
    // The good hour. Chile into amber into paper.
    return 'radial-gradient(95% 165% at 100% 0%, rgba(154,51,36,0.6) 0%, rgba(232,163,61,0.4) 26%, rgba(244,239,230,0) 62%)';
  }
  if (storm) return 'radial-gradient(95% 165% at 100% 0%, rgba(74,90,110,0.66) 0%, rgba(74,90,110,0.32) 28%, rgba(244,239,230,0) 64%)';
  if (grey) return 'radial-gradient(95% 165% at 100% 0%, rgba(120,132,146,0.46) 0%, rgba(120,132,146,0.2) 28%, rgba(244,239,230,0) 64%)';
  // A clear Texas day: warm, high, and bright.
  return 'radial-gradient(95% 165% at 100% 0%, rgba(232,163,61,0.55) 0%, rgba(232,163,61,0.22) 28%, rgba(244,239,230,0) 64%)';
}

export default function SkyOverLeander({ sky }: { sky: Sky }) {
  const night = sky.part === 'night';
  const { condition } = sky;
  const wet = condition === 'rain' || condition === 'storm';
  const snowy = condition === 'snow';
  const clouded = condition === 'cloudy' || condition === 'partly' || condition === 'fog' || wet || snowy;
  const heavy = condition === 'cloudy' || condition === 'fog' || condition === 'storm';

  // The moon at its real phase. The terminator is an ellipse over a half-plane: an offset circle
  // carves a lens and draws a bitten biscuit instead of a crescent.
  const R = 22;
  const lit = sky.moonLit;
  const waxing = sky.moonPhase < 0.5;
  const rx = Math.abs(1 - 2 * lit) * R;

  const glow = night ? '#E8E0D2' : '#E8A33D';

  return (
    <div
      role="img"
      aria-label={`The sky over Leander right now: ${night ? sky.moonName : sky.description || 'clear'}${sky.tempF != null ? `, ${sky.tempF} degrees` : ''}`}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* The wash. It IS the sky: no border, no card, just weather coming into the corner. */}
      <div className="absolute inset-0" style={{ background: washFor(sky) }} />

      {/* The body: sun or moon, up in the corner, floating. */}
      <svg
        viewBox="0 0 200 130"
        className="absolute top-0 right-0 h-[150px] sm:h-[190px] w-auto"
        preserveAspectRatio="xMaxYMin meet"
      >
        {night && !heavy && (
          <g fill="#F4EFE6">
            {[[24, 30], [52, 16], [78, 42], [104, 22], [132, 52], [156, 18], [172, 66], [118, 78], [44, 62], [190, 38]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1} opacity="0.85">
                <animate attributeName="opacity" values="0.2;0.95;0.2" dur={`${3 + (i % 5)}s`} begin={`${i * 0.5}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        )}

        {/* Sun */}
        {!night && (
          <g transform="translate(146 42)">
            <circle r={R + 20} fill={glow} opacity="0.14" />
            <circle r={R + 10} fill={glow} opacity="0.18" />
            <g stroke={glow} strokeWidth="2.4" strokeLinecap="round" opacity="0.9">
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i * Math.PI) / 6;
                const r1 = R + 6, r2 = i % 2 === 0 ? R + 20 : R + 13;
                return <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} />;
              })}
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="180s" repeatCount="indefinite" />
            </g>
            <circle r={R} fill={glow} />
          </g>
        )}

        {/* Moon, at its actual phase */}
        {night && (
          <g transform="translate(146 46)">
            <defs>
              <mask id="llg-moon" maskUnits="userSpaceOnUse" x={-R - 4} y={-R - 4} width={2 * R + 8} height={2 * R + 8}>
                <rect x={-R - 4} y={-R - 4} width={2 * R + 8} height={2 * R + 8} fill="black" />
                <circle r={R} fill="white" />
                {/* Black out the unlit HALF: a half-plane, not an offset circle. */}
                <rect x={waxing ? -R - 2 : 0} y={-R - 2} width={R + 2} height={2 * R + 4} fill="black" />
                {/* The terminator. Black carves the crescent thinner, white fills the gibbous out. */}
                <ellipse cx="0" cy="0" rx={rx} ry={R} fill={lit > 0.5 ? 'white' : 'black'} />
              </mask>
            </defs>
            <circle r={R + 14} fill={glow} opacity="0.1" />
            {/* The whole disc, faintly, so the dark limb is present and only part is lit. */}
            <circle r={R} fill="#F4EFE6" opacity="0.08" />
            <circle r={R} fill={glow} mask="url(#llg-moon)" />
            <g fill="#16130F" opacity="0.12" mask="url(#llg-moon)">
              <circle cx="-6" cy="-7" r="4.5" />
              <circle cx="7" cy="4" r="3.2" />
              <circle cx="-2" cy="10" r="2.4" />
            </g>
          </g>
        )}

        {/* Clouds drift across whatever is up there. */}
        {clouded && (
          <g fill={night ? '#242938' : '#FBF7F0'} opacity={night ? 0.92 : 0.82}>
            <g>
              <ellipse cx="118" cy="60" rx="34" ry="15" />
              <ellipse cx="146" cy="54" rx="24" ry="12" />
              <ellipse cx="96" cy="66" rx="20" ry="10" />
              <animateTransform attributeName="transform" type="translate" values="0 0; 10 0; 0 0" dur="26s" repeatCount="indefinite" />
            </g>
            {heavy && (
              <g opacity="0.9">
                <ellipse cx="58" cy="76" rx="28" ry="13" />
                <ellipse cx="84" cy="80" rx="18" ry="9" />
                <animateTransform attributeName="transform" type="translate" values="0 0; -12 0; 0 0" dur="34s" repeatCount="indefinite" />
              </g>
            )}
          </g>
        )}

        {wet && (
          <g stroke={night ? '#8FB6D6' : '#4A6E8A'} strokeWidth="2" strokeLinecap="round" opacity="0.75">
            {[92, 108, 124, 140, 156, 172].map((x, i) => (
              <line key={x} x1={x} y1="80" x2={x - 7} y2="104">
                <animate attributeName="opacity" values="0;0.9;0" dur="1.2s" begin={`${i * 0.17}s`} repeatCount="indefinite" />
              </line>
            ))}
          </g>
        )}

        {snowy && (
          <g fill={night ? '#F4EFE6' : '#7FA8C9'}>
            {[96, 116, 136, 156, 176].map((x, i) => (
              <circle key={x} cx={x} cy="84" r="2.4">
                <animate attributeName="cy" values="78;108" dur="3s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;0" dur="3s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        )}

        {condition === 'storm' && (
          <path d="M132 74 L122 96 L131 96 L124 116 L146 88 L135 88 L142 74 Z" fill="#E8A33D">
            <animate attributeName="opacity" values="0;0;1;0.3;1;0;0" dur="4.2s" repeatCount="indefinite" />
          </path>
        )}
      </svg>
    </div>
  );
}
