import type { Sky } from '@/lib/sky';

/**
 * The sky over Leander, right now, drawn rather than photographed.
 *
 * The guide is a newspaper, so this is an engraving: flat ink, hatched rays, no gradients pretending
 * to be a photograph. It reads what Open-Meteo says the weather is doing and draws THAT: sun in the
 * day, moon at night with its real phase (the terminator is a scaled ellipse, so a waxing crescent
 * genuinely looks like a waxing crescent), clouds when it is cloudy, hatching when it rains.
 *
 * It tells the truth or it says nothing. If the weather fetch fails we still draw the sky by the
 * clock and the moon by the calendar, and we simply do not print a temperature, rather than guessing
 * one and being wrong on the front page.
 */
export default function SkyOverLeander({ sky }: { sky: Sky }) {
  const night = !sky.isDay;
  const { condition } = sky;
  const wet = condition === 'rain' || condition === 'storm';
  const snowy = condition === 'snow';
  const clouded = condition === 'cloudy' || condition === 'partly' || condition === 'fog' || wet || snowy;
  const heavy = condition === 'cloudy' || condition === 'fog' || condition === 'storm';

  // The moon, properly.
  //
  // lit = 0 at new, 1 at full. Waxing means the RIGHT limb is lit (northern hemisphere).
  //
  // The mask is: the full disc in white, then HALF of it blacked out with a rectangle (a half-plane,
  // not an offset circle: an offset circle carves a lens and gives you a bitten biscuit, which is
  // what the first version drew), then the terminator ellipse laid over the middle. The ellipse is
  // BLACK below half-lit (carving the crescent thinner) and WHITE above it (filling the gibbous
  // back out). Its x-radius goes to zero at the quarters, which is exactly when the terminator is a
  // straight line.
  const R = 10.5;
  const lit = sky.moonLit;
  const waxing = sky.moonPhase < 0.5;
  const rx = Math.abs(1 - 2 * lit) * R;

  const ink = night ? '#F4EFE6' : '#16130F'; // draw in paper on ink, ink on paper
  const bg = night ? '#16130F' : '#F4EFE6';
  const hills = night ? '#070605' : '#16130F'; // a silhouette must be DARKER than the sky behind it
  const accent = night ? '#E8A33D' : '#9a3324'; // amber at night, chile by day

  return (
    <figure
      className="w-full sm:w-56 shrink-0 border-2 border-ink rounded-[2px] overflow-hidden"
      style={{ backgroundColor: bg }}
      aria-label={`The sky over Leander: ${sky.description || (night ? 'night' : 'day')}${sky.tempF != null ? `, ${sky.tempF} degrees` : ''}`}
    >
      <svg viewBox="0 0 120 70" className="w-full block" role="img">
        {/* Stars, only when there is sky to see them through. */}
        {night && !heavy && (
          <g fill={ink} opacity="0.75">
            {[[14, 12], [30, 22], [46, 9], [66, 17], [88, 11], [102, 25], [22, 34], [110, 40], [76, 31]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.9 : 0.6}>
                <animate
                  attributeName="opacity"
                  values="0.25;0.9;0.25"
                  dur={`${3 + (i % 4)}s`}
                  begin={`${i * 0.4}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </g>
        )}

        {/* The sun: a disc with hatched rays, the way a newspaper would cut it. */}
        {!night && (
          <g transform="translate(40 30)">
            <g stroke={accent} strokeWidth="1.6" strokeLinecap="round">
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i * Math.PI) / 6;
                const r1 = 13.5, r2 = i % 2 === 0 ? 19 : 16.5;
                return (
                  <line
                    key={i}
                    x1={Math.cos(a) * r1}
                    y1={Math.sin(a) * r1}
                    x2={Math.cos(a) * r2}
                    y2={Math.sin(a) * r2}
                  />
                );
              })}
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="120s" repeatCount="indefinite" />
            </g>
            <circle r="10.5" fill={accent} />
            <circle r="10.5" fill="none" stroke={ink} strokeWidth="1.2" />
          </g>
        )}

        {/* The moon, at its actual phase. */}
        {night && (
          <g transform="translate(40 30)">
            <defs>
              <mask id="moonlight" maskUnits="userSpaceOnUse" x={-R - 2} y={-R - 2} width={2 * R + 4} height={2 * R + 4}>
                <rect x={-R - 2} y={-R - 2} width={2 * R + 4} height={2 * R + 4} fill="black" />
                <circle r={R} fill="white" />
                {/* Black out the unlit HALF. A half-plane, not an offset circle. */}
                <rect x={waxing ? -R - 1 : 0} y={-R - 1} width={R + 1} height={2 * R + 2} fill="black" />
                {/* The terminator. Black carves the crescent thinner, white fills the gibbous out. */}
                <ellipse cx="0" cy="0" rx={rx} ry={R} fill={lit > 0.5 ? 'white' : 'black'} />
              </mask>
            </defs>
            {/* The unlit disc, faintly, so the WHOLE moon is present and only part of it is lit. */}
            <circle r={R} fill={ink} opacity="0.1" />
            <circle r={R} fill="#E8E0D2" mask="url(#moonlight)" />
            {/* Craters, on the lit side only. */}
            <g fill="#16130F" opacity="0.14" mask="url(#moonlight)">
              <circle cx="-3" cy="-3" r="2.2" />
              <circle cx="3.5" cy="2" r="1.6" />
              <circle cx="-1" cy="5" r="1.1" />
            </g>
            <circle r={R} fill="none" stroke={ink} strokeWidth="1" opacity="0.35" />
          </g>
        )}

        {/* Clouds. More of them, and lower, the worse it is. */}
        {clouded && (
          <g fill={night ? '#2A241D' : '#E8E0D2'} stroke={ink} strokeWidth="1.1">
            <g opacity={heavy ? 1 : 0.92}>
              <ellipse cx="66" cy="34" rx="17" ry="9" />
              <ellipse cx="80" cy="31" rx="12" ry="7.5" />
              <ellipse cx="54" cy="37" rx="11" ry="6.5" />
            </g>
            {heavy && (
              <g opacity="0.95">
                <ellipse cx="30" cy="40" rx="15" ry="8" />
                <ellipse cx="44" cy="42" rx="10" ry="6" />
              </g>
            )}
          </g>
        )}

        {/* Rain, as hatching. It is a newspaper. */}
        {wet && (
          <g stroke={night ? '#7FA8C9' : '#4A6E8A'} strokeWidth="1.3" strokeLinecap="round">
            {[52, 60, 68, 76, 84, 92].map((x, i) => (
              <line key={x} x1={x} y1="44" x2={x - 4} y2="56">
                <animate attributeName="opacity" values="0;1;0" dur="1.1s" begin={`${i * 0.16}s`} repeatCount="indefinite" />
              </line>
            ))}
          </g>
        )}

        {snowy && (
          <g fill={night ? '#F4EFE6' : '#4A6E8A'}>
            {[54, 64, 74, 84, 94].map((x, i) => (
              <circle key={x} cx={x} cy="48" r="1.5">
                <animate attributeName="cy" values="44;58" dur="2.6s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;0" dur="2.6s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        )}

        {/* A lightning bolt, because a storm should look like one. */}
        {condition === 'storm' && (
          <path d="M70 42 L64 54 L69 54 L65 64 L76 50 L70 50 L74 42 Z" fill="#E8A33D" stroke={ink} strokeWidth="0.8">
            <animate attributeName="opacity" values="0;0;1;0;0" dur="3.4s" repeatCount="indefinite" />
          </path>
        )}

        {/* The Hill Country, in silhouette. Grounds the whole thing in a place. */}
        <path
          d="M0 70 L0 60 Q14 52 26 58 Q36 62 46 55 Q58 47 70 56 Q82 64 94 57 Q106 51 120 59 L120 70 Z"
          fill={hills}
        />
      </svg>

      <figcaption
        className="px-3 py-2 border-t-2 border-ink flex items-baseline justify-between gap-2"
        style={{ backgroundColor: night ? '#0F0D0A' : '#EDE6DA' }}
      >
        <span className="font-stamp uppercase tracking-[0.1em] text-xs" style={{ color: night ? '#F4EFE6' : '#16130F' }}>
          {night ? sky.moonName : sky.description || 'Leander'}
        </span>
        <span className="font-display font-black text-lg leading-none" style={{ color: accent }}>
          {sky.tempF != null ? `${sky.tempF}°` : sky.localTime}
        </span>
      </figcaption>
    </figure>
  );
}
