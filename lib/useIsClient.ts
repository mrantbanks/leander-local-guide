'use client';

import { useSyncExternalStore } from 'react';

/**
 * The canonical isomorphic "have we hydrated yet" check: false on the server and on the first
 * paint, true afterwards. Use it for anything that must not appear in cached HTML, e.g. a live
 * open/closed pill computed against the current clock.
 *
 * Deliberately NOT the usual `useState(false)` + `useEffect(() => setMounted(true))`. Setting state
 * synchronously in an effect forces a second render pass, which on the browse grid meant ~180 cards
 * re-rendering immediately after mount for nothing. React's own lint now flags that pattern
 * (react-hooks/set-state-in-effect). useSyncExternalStore gives the same answer with no extra pass
 * and no hydration mismatch.
 */
const neverChanges = () => () => {};

export function useIsClient(): boolean {
  return useSyncExternalStore(neverChanges, () => true, () => false);
}
