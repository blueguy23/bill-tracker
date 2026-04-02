import type { Metadata } from 'next';
import type { CreditSummaryResponse } from '@/types/credit';
import { CreditView } from '@/components/CreditView';

export const metadata: Metadata = { title: 'Credit Health' };

const EMPTY_RESPONSE: CreditSummaryResponse = {
  accounts: [],
  overall: { totalBalance: 0, totalLimit: 0, utilization: null, accountCount: 0, accountsWithLimitData: 0 },
  recentPayments: [],
  score: null,
};

async function fetchCreditSummary(): Promise<CreditSummaryResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/v1/credit/summary`, { cache: 'no-store' });
  if (!res.ok) {
    console.error(`[fetchCreditSummary] API returned ${res.status} ${res.statusText}`);
    return EMPTY_RESPONSE;
  }
  return res.json() as Promise<CreditSummaryResponse>;
}

export default async function CreditPage() {
  const data = await fetchCreditSummary();

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Credit Health</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Credit utilization and payment activity</p>
        </div>
      </div>
      <CreditView initialData={data} />
    </div>
  );
}
