'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import EventCard from '@/components/EventCard';
import Help from '@/components/Help';
import { EVENT_LABELS, EVENT_EMOJI, EVENT_TYPES } from '@/lib/eventLabels';
import {
  ISO_DAYS, FREQS, WEEKS_OF_MONTH, validateEvent, whenLabel, prettyTime,
  type EventInput, type EventFreq,
} from '@/lib/eventInput';

/**
 * Add an event to a spot. Used by the owner desk AND the admin editor, so a trivia night added by
 * Anthony on a visit and one added by the owner are the same record, made the same way.
 *
 * The preview is the REAL <EventCard>, the same component the What's On board renders. The owner
 * asked to always be able to see what it looks like, and an approximation would eventually drift
 * from the truth and quietly start lying.
 */
const field = 'w-full bg-paper border border-rule px-3 py-2 font-ui text-[16px] sm:text-sm text-ink rounded-sm outline-none focus:border-chile';
const chip = 'font-stamp uppercase tracking-[0.06em] text-xs px-2.5 py-1.5 rounded-sm border transition-colors';
const on = 'bg-chile text-paper border-chile';
const off = 'border-rule text-ink-soft hover:border-ink hover:text-ink';

const EMPTY: EventInput = {
  eventType: 'trivia', title: '', description: '', freq: 'weekly',
  daysOfWeek: [], weekOfMonth: null, eventDate: null, startTime: '', endTime: '', endsOn: null,
};

export default function EventComposer({
  spotName, onCreate, types,
}: {
  spotName: string;
  /** Server action. Returns an error string, or null on success. */
  onCreate: (input: EventInput) => Promise<{ ok: boolean; error?: string }>;
  /**
   * Which kinds this composer offers. Defaults to everything.
   *
   * Happy hour is stored as an event (it has days, a start and an end, so of course it is), but it
   * is not MANAGED like one. A spot has many events and they churn; it has one standing happy hour,
   * maybe two. So the desks give it its own panel and pass types={['happy_hour']} here, and the
   * general Events panel passes everything else. One kind means no dropdown to pick from at all.
   */
  types?: string[];
}) {
  const router = useRouter();
  const kinds = types?.length ? types : EVENT_TYPES;
  const [e, setE] = useState<EventInput>({ ...EMPTY, eventType: kinds[0] });
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();

  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setE((p) => ({ ...p, [k]: v }));
  const toggleDay = (d: number) =>
    setE((p) => {
      const days = p.daysOfWeek || [];
      return { ...p, daysOfWeek: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] };
    });

  const problem = validateEvent(e);

  const save = () =>
    start(async () => {
      setErr('');
      const bad = validateEvent(e);
      if (bad) { setErr(bad); return; }
      const r = await onCreate(e);
      if (!r.ok) { setErr(r.error || 'Could not save that.'); return; }
      setE({ ...EMPTY, eventType: kinds[0] });
      router.refresh();
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-3">
        {kinds.length > 1 && (
          <div>
            <label className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1 block">What kind of thing is it</label>
            <select value={e.eventType} onChange={(x) => set('eventType', x.target.value)} className={field}>
              {kinds.map((k) => (
                <option key={k} value={k}>{EVENT_EMOJI[k] || '📅'} {EVENT_LABELS[k] || k}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1 block">Call it something</label>
          <input value={e.title} onChange={(x) => set('title', x.target.value)} placeholder="e.g. Trivia with Dave" className={field} maxLength={120} />
        </div>

        <div>
          <label className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1 block">Anything else worth knowing (optional)</label>
          <input value={e.description || ''} onChange={(x) => set('description', x.target.value)} placeholder="e.g. Teams of six, free to enter, prizes for the top three" className={field} maxLength={500} />
        </div>

        {/* Recurrence */}
        <div>
          <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1.5 flex items-center">
            How often
            <Help
              text="Every week is the usual: trivia every Tuesday. Every month is for things like the first Friday. One time is a single date, and it drops off the board by itself once it has passed."
              example="Live music on the last Saturday of the month: pick Every month, Last, Sat."
            />
          </p>
          <div className="flex flex-wrap gap-2">
            {FREQS.map((f) => (
              <button key={f.value} type="button" title={f.help} onClick={() => set('freq', f.value as EventFreq)} className={`${chip} ${e.freq === f.value ? on : off}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {e.freq === 'monthly_dow' && (
          <div>
            <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1.5">Which week</p>
            <div className="flex flex-wrap gap-2">
              {WEEKS_OF_MONTH.map((w) => (
                <button key={w.value} type="button" onClick={() => set('weekOfMonth', w.value)} className={`${chip} ${e.weekOfMonth === w.value ? on : off}`}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {e.freq === 'once' ? (
          <div>
            <label className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1 block">The date</label>
            <input type="date" value={e.eventDate || ''} onChange={(x) => set('eventDate', x.target.value || null)} className={field} />
          </div>
        ) : (
          <div>
            <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1.5">Which days</p>
            <div className="flex flex-wrap gap-1.5">
              {ISO_DAYS.map(([n, lbl]) => (
                <button key={n} type="button" onClick={() => toggleDay(n)} className={`${chip} ${(e.daysOfWeek || []).includes(n) ? on : off}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1 block">Starts</label>
            <input type="time" value={e.startTime || ''} onChange={(x) => set('startTime', x.target.value)} className={field} />
          </div>
          <div className="flex-1">
            <label className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1 block">
              {e.eventType === 'happy_hour' ? 'Ends' : 'Ends (optional)'}
            </label>
            <input type="time" value={e.endTime || ''} onChange={(x) => set('endTime', x.target.value)} className={field} />
          </div>
        </div>

        {e.freq !== 'once' && (
          <div>
            <label className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-1 flex items-center">
              Runs until (optional)
              <Help text="Leave this empty and it runs until you end it yourself. Set a date and it comes off the board on its own, so you never have to remember to switch it off." example="A summer patio series that stops in September." />
            </label>
            <input type="date" value={e.endsOn || ''} onChange={(x) => set('endsOn', x.target.value || null)} className={field} />
          </div>
        )}

        {err && <p className="font-ui text-sm text-oxblood">{err}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={pending || !!problem}
            className="font-stamp uppercase tracking-[0.1em] text-sm bg-chile text-paper px-5 py-2.5 rounded-sm hover:bg-oxblood disabled:opacity-50"
          >
            {pending ? 'Putting it up...' : 'Put it on the board'}
          </button>
          {problem && <span className="font-ui text-xs text-ink-soft">{problem}</span>}
        </div>
      </div>

      {/* The live preview. This is the same card the board renders. */}
      <div className="lg:sticky lg:top-4">
        <p className="font-stamp uppercase tracking-[0.08em] text-xs text-ink-soft mb-2">
          This is exactly how it shows on What&apos;s On
        </p>
        <EventCard
          preview
          emoji={EVENT_EMOJI[e.eventType] || '📅'}
          time={prettyTime(e.startTime)}
          typeLabel={EVENT_LABELS[e.eventType] || 'Event'}
          title={e.title}
          spot={spotName}
        />
        <p className="font-hand text-xl text-oxblood mt-3">{whenLabel(e)}{e.endTime ? `, until ${prettyTime(e.endTime)}` : ''}</p>
        <p className="font-ui text-xs text-ink-soft mt-1">
          It shows on your own page and on the town-wide{' '}
          <a href="/whats-on" target="_blank" rel="noopener" className="text-chile underline underline-offset-2">What&apos;s On</a> board.
        </p>
      </div>
    </div>
  );
}
