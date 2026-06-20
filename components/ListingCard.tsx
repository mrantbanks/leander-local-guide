import Tag from '@/components/Tag';
import { Listing } from '@/data/listings';

interface ListingCardProps {
  listing: Listing;
}

const categoryIcons: Record<string, string> = {
  Food:    '🌮',
  Drink:   '🍹',
  Coffee:  '☕',
  Bar:     '🥃',
  Brewery: '🍺',
};

function getTodayKey() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  return days[new Date().getDay()];
}

function isOpenNow(hoursDetail: any): boolean | null {
  if (!hoursDetail) return null;
  const today = getTodayKey();
  const todayHours = hoursDetail[today];
  if (!todayHours) return false;
  const now = new Date();
  const curr = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = todayHours.open.split(':').map(Number);
  const [ch, cm] = todayHours.close.split(':').map(Number);
  return curr >= oh * 60 + om && curr < ch * 60 + cm;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const icon = listing.tags.includes('Food Truck')
    ? '🚚'
    : (categoryIcons[listing.category] ?? '📍');

  const openNow = isOpenNow(listing.hoursDetail);

  return (
    <div className="bg-white rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">

      {/* Body */}
      <div className="p-4 flex-1">

        {/* Header row: icon + name + rating */}
        <div className="flex items-start gap-2.5 mb-2.5">
          <span className="text-xl leading-none mt-0.5 flex-shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-emerald-700 transition-colors">
              {listing.name}
            </h2>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mt-0.5">
              {listing.category}
            </p>
          </div>
          {listing.rating != null && (
            <span className="flex-shrink-0 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded leading-none">
              ★ {listing.rating}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
          {listing.description}
        </p>

        {/* Status chips */}
        {(openNow !== null || listing.happyHour) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {openNow !== null && (
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                openNow
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-stone-100 text-gray-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${openNow ? 'bg-green-500' : 'bg-gray-400'}`} />
                {openNow ? 'Open Now' : 'Closed'}
              </span>
            )}
            {listing.happyHour && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-100">
                🍻 {listing.happyHour}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      {listing.tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {listing.tags.map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-stone-100 flex items-center justify-between gap-3 text-xs text-gray-400">
        <span className="truncate">📍 {listing.address}</span>
        {listing.hours && (
          <span className="flex-shrink-0 text-gray-400">{listing.hours}</span>
        )}
      </div>

    </div>
  );
}
