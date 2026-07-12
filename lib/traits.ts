// The things only a person who actually went can tell you.
//
// Client-safe (no DB import): the contribute form needs this vocabulary in the browser.
//
// Every trait here is deliberately something GOOGLE STRUCTURALLY CANNOT KNOW. Google will tell you a
// place has a free parking lot. It will never tell you the lot is a nightmare at 7pm on a Friday, or
// that you cannot hear the person opposite you, or that you waited forty minutes. That gap is the
// entire reason a local guide exists, so it is the gap we ask locals to fill.
//
// Kept short on purpose. A wall of chips is a chore, and a chore does not get done.

export type TraitGroup = {
  key: string;
  question: string;
  /** Only one of these can be true at a time (you cannot be both quiet and loud). */
  exclusive: boolean;
  traits: { key: string; label: string }[];
};

export const TRAIT_GROUPS: TraitGroup[] = [
  {
    key: 'noise',
    question: 'Can you hear each other?',
    exclusive: true,
    traits: [
      { key: 'quiet', label: 'Quiet enough to talk' },
      { key: 'lively', label: 'Lively' },
      { key: 'loud', label: 'Properly loud' },
    ],
  },
  {
    key: 'wait',
    question: 'How long did you wait?',
    exclusive: true,
    traits: [
      { key: 'nowait', label: 'Straight in' },
      { key: 'shortwait', label: 'Ten, twenty minutes' },
      { key: 'longwait', label: 'A long wait' },
    ],
  },
  {
    key: 'parking',
    question: 'And the parking, really?',
    exclusive: true,
    traits: [
      { key: 'easypark', label: 'Easy to park' },
      { key: 'hardpark', label: 'Parking is a pain' },
    ],
  },
  {
    key: 'goodfor',
    question: 'Who is it good for?',
    exclusive: false,
    traits: [
      { key: 'solo', label: 'Going on your own' },
      { key: 'date', label: 'A date' },
      { key: 'groups', label: 'A big group' },
      { key: 'kids', label: 'Kids' },
      { key: 'laptop', label: 'Sitting with a laptop' },
    ],
  },
];

export const ALL_TRAITS: { key: string; label: string; group: string }[] = TRAIT_GROUPS.flatMap((g) =>
  g.traits.map((t) => ({ ...t, group: g.key }))
);

const BY_KEY = new Map(ALL_TRAITS.map((t) => [t.key, t]));

export const isTrait = (k: string): boolean => BY_KEY.has(k);
export const traitLabel = (k: string): string => BY_KEY.get(k)?.label ?? k;

/**
 * Below this, a trait is one person's opinion, not the room's, and printing "1 of 1 says it is quiet"
 * is the "1 local weighed in" trap the site has already learned once. Show nothing until three people
 * have been asked the same question.
 */
export const MIN_VOICES = 3;

export type TraitTally = { key: string; label: string; n: number; of: number; group: string };

/**
 * Count a trait against the number of people who answered THAT question, not against everybody. If
 * twelve people answered "can you hear each other" and nine said quiet, that is 9 of 12. Counting it
 * against every review ever left would quietly understate it.
 */
export function tallyTraits(reviews: { traits: string[] }[]): TraitTally[] {
  const counts = new Map<string, number>();
  const answered = new Map<string, number>(); // per GROUP

  for (const r of reviews) {
    const groupsSeen = new Set<string>();
    for (const key of r.traits || []) {
      const t = BY_KEY.get(key);
      if (!t) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
      groupsSeen.add(t.group);
    }
    for (const g of groupsSeen) answered.set(g, (answered.get(g) || 0) + 1);
  }

  return ALL_TRAITS.map((t) => ({
    key: t.key,
    label: t.label,
    group: t.group,
    n: counts.get(t.key) || 0,
    of: answered.get(t.group) || 0,
  }))
    .filter((t) => t.n > 0 && t.of >= MIN_VOICES)
    .sort((a, b) => b.n / b.of - a.n / a.of || b.n - a.n);
}
