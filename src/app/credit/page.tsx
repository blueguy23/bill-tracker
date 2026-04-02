import type { Metadata } from 'next';
import type { CreditSummaryResponse } from '@/types/credit';
import type { CreditAdvisorResponse } from '@/types/creditAdvisor';
import { CreditView } from '@/components/CreditView';

export const metadata: Metadata = { title: 'Credit Health' };

const EMPTY_SUMMARY: CreditSummaryResponse = {
  accounts: [],
  overall: { totalBalance: 0, totalLimit: 0, utilization: null, accountCount: 0, accountsWithLimitData: 0 },
  recentPayments: [],
  score: null,
};

const EMPTY_ADVISOR: CreditAdvisorResponse = { trend: [], azeo: null };

async function fetchCreditData(baseUrl: string): Promise<{
  summary: CreditSummaryResponse;
  advisor: CreditAdvisorResponse;
}> {
  const [summaryRes, advisorRes] = await Promise.all([
    fetch(`${baseUrl}/api/v1/credit/summary`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/v1/credit/advisor`, { cache: 'no-store' }),
  ]);

  const summary = summaryRes.ok
    ? await summaryRes.json() as CreditSummaryResponse
    : EMPTY_SUMMARY;

  const advisor = advisorRes.ok
    ? await advisorRes.json() as CreditAdvisorResponse
    : EMPTY_ADVISOR;

  return { summary, advisor };
}

export default async function CreditPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { summary, advisor } = await fetchCreditData(baseUrl);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Credit Health</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Credit utilization and payment activity</p>
        </div>
      </div>
      <CreditView initialData={summary} advisorData={advisor} />
    </div>
  );
}
