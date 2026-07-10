// Pure, client-safe helpers for Local Passport perks (no DB imports — usable in client previews).
export type Special = {
  id: number; slug?: string; restaurant?: string; category?: string;
  title: string; details: string | null; recurring: boolean; daysOfWeek: number[] | null;
  startsOn: string | null; endsOn: string | null;
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function scheduleLabel(s: { recurring: boolean; daysOfWeek: number[] | null; endsOn: string | null }): string {
  if (s.recurring && s.daysOfWeek?.length) return `Every ${s.daysOfWeek.slice().sort((a, b) => a - b).map((i) => DAYS[i]).join(', ')}`;
  if (s.endsOn) return `Through ${new Date(s.endsOn + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
  return 'Ongoing';
}
