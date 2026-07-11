'use client';

import { useEffect, useRef } from 'react';
import { recordStampPull } from '@/app/actions';

/**
 * Records that a real person opened this stamp. Renders nothing.
 *
 * Deliberately a client island rather than a call in the /ticket page body: a server-render hook
 * would count every crawler and prefetch as a human, and the llg_anon cookie is httpOnly so the
 * device id can only be attached server-side, inside the action.
 *
 * Fire-and-forget on purpose. Attribution is valuable, but not so valuable that a failed insert
 * should stop someone getting their stamp at the counter.
 */
export default function StampPull({ specialId, source }: { specialId: number; source: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return; // React strict mode double-invokes effects in dev
    fired.current = true;
    void recordStampPull(specialId, source).catch(() => {});
  }, [specialId, source]);
  return null;
}
