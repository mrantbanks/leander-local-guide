import type { Spot } from './spots';

export type Board = { slug: string; title: string; blurb: string; emoji: string; match: (s: Spot) => boolean };

const has = (s: Spot, c: string) => s.cuisines.includes(c);

export const BOARDS: Board[] = [
  { slug: 'most-loved', emoji: '🔥', title: 'Most Loved in Leander', blurb: 'The highest-rated spots in town, weighted by locals.', match: () => true },
  { slug: 'best-tacos', emoji: '🌮', title: "Leander's Best Tacos", blurb: 'Where Leander actually gets its tacos.', match: (s) => has(s, 'Tacos') || has(s, 'Tex-Mex') || has(s, 'Mexican') },
  { slug: 'desi-land', emoji: '🍛', title: 'Desi Land: Best Indian in Leander', blurb: "Leander's surprising, glorious run of Indian kitchens.", match: (s) => has(s, 'Indian') },
  { slug: 'best-bbq', emoji: '🔥', title: "Leander's Best BBQ", blurb: 'Brisket and smoke worth the wait.', match: (s) => has(s, 'BBQ') },
  { slug: 'best-pizza', emoji: '🍕', title: "Leander's Best Pizza", blurb: 'The pies worth the carbs.', match: (s) => has(s, 'Pizza') },
  { slug: 'best-burgers', emoji: '🍔', title: "Leander's Best Burgers", blurb: 'The patties that earn it.', match: (s) => has(s, 'Burgers') },
  { slug: 'best-coffee', emoji: '☕', title: "Leander's Best Coffee", blurb: 'Where the locals actually caffeinate.', match: (s) => s.category === 'Cafe' },
  { slug: 'best-bars', emoji: '🍸', title: "Leander's Best Bars & Breweries", blurb: 'Where everybody knows your name.', match: (s) => ['Bar', 'Brewery'].includes(s.category) },
  { slug: 'best-bakeries', emoji: '🥐', title: "Leander's Best Bakeries", blurb: 'The morning is what you make it.', match: (s) => s.category === 'Bakery' },
  { slug: 'food-trucks', emoji: '🚚', title: "Leander's Best Food Trucks", blurb: 'The gravel-lot legends.', match: (s) => s.category === 'Food Truck' },
  { slug: 'best-patios', emoji: '🌿', title: "Leander's Best Patios", blurb: 'Eat outside, Leander.', match: (s) => s.amenities.includes('Patio') },
];

export const getBoard = (slug: string) => BOARDS.find((b) => b.slug === slug);

// Rank: Google rating, lifted by local love (verdict taps + been-here).
export const rankScore = (s: Spot) => (s.ratingGoogle ?? 0) + (s.worthIt - s.skipIt) * 0.05 + s.beenHere * 0.02;
