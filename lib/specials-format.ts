// Pure, client-safe helpers for Local Passport perks (no DB imports — usable in client previews).
export type IssuerType = 'business' | 'guide';
export type RedeemType = 'counter' | 'digital' | 'mail';

export type Special = {
  id: number; slug?: string; restaurant?: string; category?: string;
  title: string; details: string | null; recurring: boolean; daysOfWeek: number[] | null;
  startsOn: string | null; endsOn: string | null;
  // A Guide perk has no owning business: slug and restaurant are absent by design.
  issuerType: IssuerType; redeemType: RedeemType;
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const GUIDE_ISSUER = 'The Leander Local Guide';

/** Who is offering this perk. Never leaves the reader guessing whose counter it is. */
export function issuerLabel(s: { issuerType: IssuerType; restaurant?: string }): string {
  return s.issuerType === 'guide' ? GUIDE_ISSUER : (s.restaurant || '');
}

/**
 * How the perk actually reaches you. Deliberately plain language: the brand voice bans
 * "redeem"/"unlock", and a diner at the counter needs to know what they get, instantly.
 */
export function handoffLabel(s: { redeemType: RedeemType }): string {
  return s.redeemType === 'digital' ? 'Yours online, no counter needed'
    : s.redeemType === 'mail' ? 'We put it in the post'
      : 'Show this at the counter';
}

export function scheduleLabel(s: { recurring: boolean; daysOfWeek: number[] | null; endsOn: string | null }): string {
  if (s.recurring && s.daysOfWeek?.length) return `Every ${s.daysOfWeek.slice().sort((a, b) => a - b).map((i) => DAYS[i]).join(', ')}`;
  if (s.endsOn) return `Through ${new Date(s.endsOn + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
  return 'Ongoing';
}
