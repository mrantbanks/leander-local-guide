import { permanentRedirect } from 'next/navigation';

/**
 * Gone. This was "Find Your Spot": a browse page with All / Open Now / Hidden Gems / Food Trucks
 * filters. The home page now does all of that and more, from the database.
 *
 * It had to go rather than merely be left alone, because it was live, indexable, and wrong in three
 * ways at once:
 *
 *   - It read `@/data/listings`, a static seed file, so it served whatever was true whenever that
 *     file was last edited. Not the database. Not now.
 *   - Its open/closed test used `new Date().getDay()` in the BROWSER, so it answered in the
 *     VISITOR'S timezone. Someone checking from New York at midnight got Leander's Sunday hours on
 *     a Saturday night. The site has one clock and it is in Texas.
 *   - That test was `now >= open && now < close`, which cannot be true for anywhere that shuts after
 *     midnight. Every late bar in Leander read as "closed", permanently, on a filter called Open Now.
 *
 * Nothing linked here, so a 301 costs us nothing and stops the lying.
 */
export default function GoneToHome(): never {
  permanentRedirect('/');
}
