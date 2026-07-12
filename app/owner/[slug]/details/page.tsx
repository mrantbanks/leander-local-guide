import { notFound } from 'next/navigation';
import { getSpotAny } from '@/lib/spots';
import { getOwnerContent, ownerGate } from '@/lib/owner';
import OwnerEditor from '@/components/OwnerEditor';
import LogoStudio from '@/components/LogoStudio';

export const dynamic = 'force-dynamic';

export default async function OwnerDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await ownerGate(slug))) notFound();

  const spot = await getSpotAny(slug);
  if (!spot) notFound();
  const { ownerContent, googleWeek } = await getOwnerContent(slug);

  return (
    <div>
      <h1 className="font-display font-black text-2xl text-ink mb-1">Your details</h1>
      <p className="font-ui text-sm text-ink-soft mb-6">
        The facts about your business. These override whatever Google told us, because you know and Google guesses.
        Saves go live on your page within about a minute.
      </p>

      <div className="border border-rule bg-paper-raised rounded-sm p-4 mb-8">
        <LogoStudio
          slug={slug}
          name={spot.name}
          current={spot.logo}
          headerPhoto={spot.headerPhoto?.url || spot.localPhotos[0]?.url || null}
        />
      </div>

      <OwnerEditor
        slug={slug}
        googleWeek={googleWeek}
        initial={{
          phone: spot.phone || '', website: spot.website || '', menuUrl: spot.menuUrl || '', orderUrl: spot.orderUrl || '',
          happyHour: spot.happyHour || '', blurb: spot.ownerBlurb || '', hours: ownerContent.hours || null,
        }}
      />
    </div>
  );
}
