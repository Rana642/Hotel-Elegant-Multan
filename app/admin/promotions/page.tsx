import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { getAllPromotions } from '@/lib/promotions';
import { getRooms } from '@/lib/rooms';
import PromotionForm from './PromotionForm';
import AddPromotionButton from './AddPromotionButton';

export const metadata: Metadata = { title: 'Promotions' };
export const revalidate = 0;

export default async function PromotionsAdminPage() {
  await requireAdmin();
  const [promos, rooms] = await Promise.all([getAllPromotions(), getRooms()]);
  const roomLite = rooms.map((r) => ({ id: r.id, name: r.name }));

  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0 max-w-6xl">
      <div className="mb-6">
        <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E]">Promotions &amp; Deals</h1>
        <p className="font-montserrat text-sm text-gray-500 mt-1">
          Marketing cards for the Promotions page. Add a discount % and check-in date range to also make a promotion apply automatically as a deal on the booking page.
        </p>
      </div>

      {promos.length === 0 ? (
        <div className="bg-white border border-gray-200 p-10 text-center">
          <p className="font-montserrat text-gray-500 text-sm mb-4">
            No promotions yet. Click <strong>+ Add promotion</strong> to create the first one.
          </p>
          <AddPromotionButton />
        </div>
      ) : (
        <>
          {promos.map((p) => (
            <PromotionForm key={p.id} initial={p as any} rooms={roomLite} />
          ))}

          <div className="mt-6 flex justify-center border border-dashed border-gray-300 bg-white py-6">
            <AddPromotionButton />
          </div>
        </>
      )}
    </div>
  );
}
