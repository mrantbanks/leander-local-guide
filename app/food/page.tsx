import { getAllSpots } from '@/lib/spots';
import SpotCard from '@/components/SpotCard';
import PageHero from '@/components/PageHero';
import SiteFooter from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Food in Leander',
  description: "Where the locals actually eat in Leander, Texas. Restaurants and food trucks worth the drive, with Anthony's honest take on each.",
};

export default async function FoodPage() {
  const all = await getAllSpots();
  const spots = all.filter((s) => ['Restaurant', 'Food Truck'].includes(s.category));
  return (
    <main>
      <PageHero emoji="🌮" title="Food" subtitle={`Where the locals actually eat. ${spots.length} spots worth the drive.`} />
      <section className="max-w-6xl mx-auto px-5 py-12">
        {spots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12">
            {spots.map((s) => <SpotCard key={s.id} spot={s} />)}
          </div>
        ) : (
          <p className="font-hand text-2xl text-oxblood">Nothing here yet, check back soon.</p>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
