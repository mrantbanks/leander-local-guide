'use client';

import { useState } from 'react';
import Help from '@/components/Help';
import { AMENITY_TAGS, EDITORIAL_BADGES, CHAIN_STATUS } from '@/lib/tags';

/**
 * Every tag that can appear on a spot page, in one grid, with the live ones lit up.
 *
 * Before this, the admin could only edit tags by typing a comma-separated list into a text box, and
 * had no way at all to see which of the Google-imported amenities were on. So the tags on the public
 * page and the tags in the editor were two different, unreconcilable things.
 *
 * Lit = on the page right now. Click to toggle. Values ride out on hidden inputs, so this still
 * saves through the same one server action as the rest of the form.
 */
const chip = 'font-stamp uppercase tracking-[0.06em] text-xs px-2.5 py-1.5 rounded-sm border transition-colors';
const on = 'bg-chile text-paper border-chile';
const off = 'border-rule text-ink-soft hover:border-ink hover:text-ink';

export default function TagPicker({
  amenities, badges, chainStatus, computed,
}: {
  /** attribute keys that are currently true */
  amenities: string[];
  /** editorial.badges currently pinned */
  badges: string[];
  chainStatus: string;
  /** worked out by the code, not toggleable. Shown so nobody hunts for a switch that is not there. */
  computed: { label: string; why: string }[];
}) {
  const [amen, setAmen] = useState<string[]>(amenities);
  const [pins, setPins] = useState<string[]>(badges);
  const [chain, setChain] = useState(chainStatus || 'unknown');

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  // Anything hand-pinned that is not in the standard list still has to survive a save.
  const extraPins = pins.filter((b) => !EDITORIAL_BADGES.includes(b));

  return (
    <div className="space-y-5">
      {/* The tags the code decides for itself. Read-only on purpose. */}
      {computed.length > 0 && (
        <div>
          <p className="font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft mb-1.5 flex items-center">
            Worked out automatically
            <Help
              text="These are computed from the data, not stored. You cannot switch them off here. Hidden Gem is the top 8 local spots rated 4.5+ with a small review count, and it is recalculated as ratings move. Local Favorite is local, rated 4.6+, with more than 150 reviews."
              example="A Local Favorite is always also Local. That is why both tags show."
            />
          </p>
          <div className="flex flex-wrap gap-2">
            {computed.map((c) => (
              <span key={c.label} className={`${chip} border-ink bg-paper-sunk text-ink cursor-help`} title={c.why}>
                {c.label} ●
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ownership. The guide's whole editorial position. */}
      <div>
        <p className="font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft mb-1.5 flex items-center">
          Who owns it
          <Help
            text="Local means independent, not a chain. It is the guide's whole point, and it drives sorting everywhere: local spots come first, then Texas chains, then national chains last. Hidden Gems can only ever be local."
            example="Whataburger is a Texas Chain. McDonald's is a Chain. Stubblefield's is Local."
          />
        </p>
        <div className="flex flex-wrap gap-2">
          {CHAIN_STATUS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.help}
              onClick={() => setChain(c.value)}
              className={`${chip} ${chain === c.value ? on : off}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="chainStatus" value={chain} />
      </div>

      {/* Editorial pins. These render FIRST on the page. */}
      <div>
        <p className="font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft mb-1.5 flex items-center">
          Anthony&apos;s pins
          <Help
            text="Hand-pinned badges. These render before every other tag, on the card and on the page. Pinning Hidden Gem forces it on even when the automatic rule would not pick the spot."
            example="Pin Anthony's Pick on the ones you would actually send a friend to."
          />
        </p>
        <div className="flex flex-wrap gap-2">
          {EDITORIAL_BADGES.map((b) => (
            <button key={b} type="button" onClick={() => toggle(pins, setPins, b)} className={`${chip} ${pins.includes(b) ? on : off}`}>
              {b}
            </button>
          ))}
          {extraPins.map((b) => (
            <button key={b} type="button" onClick={() => toggle(pins, setPins, b)} className={`${chip} ${on}`}>
              {b}
            </button>
          ))}
        </div>
        <input type="hidden" name="badges" value={pins.join(',')} />
      </div>

      {/* Amenities. Imported from Google, and Google is often wrong. */}
      <div>
        <p className="font-stamp uppercase tracking-[0.1em] text-xs text-ink-soft mb-1.5 flex items-center">
          What the place has
          <Help
            text="Imported from Google Places, and Google is regularly wrong about these. You have stood in the room and Google has not, so your toggle wins. Whatever is lit here is exactly what shows on the public page."
            example="Google swears a taco trailer has Reservations. It does not. Turn it off."
          />
        </p>
        <div className="flex flex-wrap gap-2">
          {AMENITY_TAGS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => toggle(amen, setAmen, key)} className={`${chip} ${amen.includes(key) ? on : off}`}>
              {label}
            </button>
          ))}
        </div>
        <input type="hidden" name="amenities" value={amen.join(',')} />
      </div>

      <p className="font-ui text-xs text-ink-soft">
        Lit chips are live on the page right now. Saving writes exactly what you see here.
      </p>
    </div>
  );
}
