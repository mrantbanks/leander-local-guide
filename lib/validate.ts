// Guardrails: only accept happy-hours / events that carry a real clock time.

// Matches "7 PM", "11:30", "4-7pm", "2:00 PM", "11AM-2:30PM", etc.
export function hasClockTime(s: string | null | undefined): boolean {
  return !!s && /\b\d{1,2}\s*:?\d{0,2}\s*(am|pm)\b|\b\d{1,2}:\d{2}\b/i.test(s);
}

// Event types that are day-based and don't need a specific start time to be valid.
const DAY_BASED = new Set(['kids_eat_free', 'brunch']);
export function eventRequiresTime(eventType: string): boolean {
  return !DAY_BASED.has(eventType);
}
