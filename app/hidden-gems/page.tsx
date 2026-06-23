import { getHiddenGems } from '@/lib/spots';
import SpotCard from '@/components/SpotCard';
import PageHero from '@/components/PageHero';
import SiteFooter from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Hidden Gems in Leander',
  description: "Leander's under-the-radar local spots, the well-loved places the locals keep quiet about.",
};

export default async function HiddenGemsPage() {
  const spots = await getHiddenGems();
  return (
    <main>
      <PageHero
        emoji="💎"
        title="Hidden Gems"
        subtitle={`Local, well-loved, under the radar. ${spots.length} spots the locals keep quiet.`}
      />
      <section className="max-w-6xl mx-auto px-5 py-12">
        {spots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12">
            {spots.map((s) => <SpotCard key={s.id} spot={s} />)}
          </div>
        ) : (
          <p className="font-hand text-2xl text-oxblood">Anthony&apos;s still digging, gems incoming.</p>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
