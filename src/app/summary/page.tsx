import type { BillResponse } from '@/types/bill';
import { MonthlySummary } from '@/components/MonthlySummary';

async function fetchBills(): Promise<BillResponse[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/v1/bills`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json() as { bills: BillResponse[] };
  return data.bills;
}

export default async function SummaryPage() {
  const bills = await fetchBills();

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-white">Monthly Summary</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Spending breakdown by month</p>
      </div>
      <MonthlySummary bills={bills} />
    </div>
  );
}
