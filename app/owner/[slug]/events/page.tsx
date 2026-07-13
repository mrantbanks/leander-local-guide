import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSpotAny } from '@/lib/spots';
import { ownerGate } from '@/lib/owner';
import { getEventsForSpot } from '@/lib/events';
import { HAPPY_HOUR_TYPE, BOARD_EVENT_TYPES } from '@/lib/eventLabels';
import { createOwnerEvent, removeOwnerEvent } from '@/app/actions';
import EventComposer from '@/components/EventComposer';
import Help from '@/components/Help';
import type { EventInput } from '@/lib/eventInput';

export const dynamic = 'force-dynamic';

export default async function OwnerEvents({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await ownerGate(slug))) notFound();

  const spot = await getSpotAny(slug);
  if (!spot) notFound();
  const all = await getEventsForSpot(slug);
  const happyHours = all.filter((e) => e.type === HAPPY_HOUR_TYPE);
  const events = all.filter((e) => e.type !== HAPPY_HOUR_TYPE);

  async function create(input: EventInput) {
    'use server';
    return createOwnerEvent(slug, input);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h1 className="font-display font-black text-2xl text-ink">What&apos;s On</h1>
        <Help
          text="Anything you run on a schedule: trivia, live music, karaoke, bingo, a kids-eat-free night. It shows on your own page AND on the town-wide What's On board, which is one of the most-read pages on the guide. Nobody has to approve it: you know your own calendar."
          example="Trivia every Tuesday at 7pm. Live music on the last Saturday of the month."
        />
      </div>
      <p className="font-ui text-sm text-ink-soft mb-6">
        Put your regular nights on the board. It goes up straight away, and it comes down on its own when you tell it to stop.
      </p>

      {/* Happy hour, on its own, first. It is one standing thing rather than one of many, "change ours"
          rather than "add another", and it is the single fact most people come to the page to find. */}
      <section className="mb-9 border border-rule bg-paper-raised p-4 rounded-sm">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-display font-bold text-xl text-ink">🍻 Your happy hour</h2>
          <Help
            text="Your standing drinks-and-bites window. This is the one people plan around, and it is its own filter on the home page and on the map, so it is worth getting exactly right. Say what the deal actually is, not just that you have one."
            example="Mon to Fri, 3pm to 6pm. 30% off drinks and select appetizers."
          />
        </div>
        {happyHours.length === 0 ? (
          <p className="font-ui text-sm text-ink-soft mb-4">
            You have not told us your happy hour. Add it and you show up when people filter for one.
          </p>
        ) : (
          <ul className="border-t border-rule mb-4 mt-2">
            {happyHours.map((e) => (
              <li key={e.id} className="border-b border-rule py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-stamp uppercase tracking-[0.06em] text-sm text-chile">{e.when}</p>
                  {e.description && <p className="font-ui text-sm text-ink mt-0.5">{e.description}</p>}
                </div>
                <form
                  action={async () => {
                    'use server';
                    await removeOwnerEvent(slug, e.id);
                  }}
                >
                  <button className="font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft hover:text-oxblood shrink-0">
                    Take it down
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <EventComposer spotName={spot.name} onCreate={create} types={[HAPPY_HOUR_TYPE]} />
      </section>

      {events.length > 0 && (
        <>
          <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-3">On the board now</h2>
          <ul className="border-t border-rule mb-8">
            {events.map((e) => (
              <li key={e.id} className="border-b border-rule py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold text-ink">
                    <span className="mr-1.5">{e.emoji}</span>{e.title}
                  </p>
                  <p className="font-stamp uppercase tracking-[0.06em] text-sm text-chile mt-0.5">{e.when}</p>
                  {e.description && <p className="font-ui text-sm text-ink-soft mt-0.5">{e.description}</p>}
                </div>
                <form
                  action={async () => {
                    'use server';
                    await removeOwnerEvent(slug, e.id);
                  }}
                >
                  <button className="font-stamp uppercase tracking-[0.06em] text-xs text-ink-soft hover:text-oxblood shrink-0">
                    Take it down
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="font-stamp uppercase tracking-[0.12em] text-sm text-ink mb-3">
        {events.length > 0 ? 'Add another' : 'Put something on the board'}
      </h2>
      <EventComposer spotName={spot.name} onCreate={create} types={BOARD_EVENT_TYPES} />

      <p className="font-ui text-xs text-ink-soft mt-8 border-t border-rule pt-4">
        Events you add show as confirmed, because they came from you. The ones Anthony&apos;s crawler finds elsewhere
        are marked unconfirmed until somebody checks them. See the whole town on{' '}
        <Link href="/whats-on" target="_blank" className="text-chile underline underline-offset-2">What&apos;s On</Link>.
      </p>
    </div>
  );
}
