// Client-safe event vocabulary. Split out of lib/events.ts, which imports the Postgres pool and so
// cannot be pulled into a browser bundle. The composer needs these labels live, as you type.

export const EVENT_LABELS: Record<string, string> = {
  trivia: 'Trivia', karaoke: 'Karaoke', live_music: 'Live Music', bingo: 'Bingo',
  game_night: 'Game Night', comedy: 'Comedy', open_mic: 'Open Mic', book_club: 'Book Club',
  watch_party: 'Watch Party', run_club: 'Run Club', kids_eat_free: 'Kids Eat Free',
  market: 'Market', tasting: 'Tasting', other: 'Event',
};

export const EVENT_EMOJI: Record<string, string> = {
  trivia: '🧠', karaoke: '🎤', live_music: '🎸', bingo: '🎱', game_night: '🎲', comedy: '🎙️',
  open_mic: '🎶', book_club: '📚', watch_party: '🏈', run_club: '🏃', kids_eat_free: '🧒',
  market: '🛍️', tasting: '🍷', other: '📅',
};

// 'brunch' is deliberately absent: it is a service, not an event. The enum value still exists in
// Postgres (you cannot drop one cheaply) and lib/events.ts filters it out of every query.
export const EVENT_TYPES = Object.keys(EVENT_LABELS);
