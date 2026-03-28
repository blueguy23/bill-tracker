import type { BillResponse } from '@/types/bill';
import { BillsView } from '@/components/BillsView';

async function fetchBills(): Promise<BillResponse[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/v1/bills`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json() as { bills: BillResponse[] };
  return data.bills.filter((b) => b.isRecurring);
}

export default async function RecurringPage() {
  const bills = await fetchBills();

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Recurring Bills</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {bills.length === 0 ? 'No recurring bills' : `${bills.length} recurring bill${bills.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
      <BillsView initialBills={bills} />
    </div>
  );
}
