import type { Metadata } from 'next';
import type { CreditSummaryResponse } from '@/types/credit';
import type { CreditAdvisorResponse } from '@/types/creditAdvisor';
import { CreditView } from '@/components/CreditView';
import { getDb } from '@/adapters/db';
import { handleGetCreditSummary } from '@/handlers/credit';
import { handleGetCreditAdvisor } from '@/handlers/creditAdvisor';

export const metadata: Metadata = { title: 'Credit Health' };

const EMPTY_SUMMARY: CreditSummaryResponse = {
  accounts: [],
  overall: { totalBalance: 0, totalLimit: 0, utilization: null, accountCount: 0, accountsWithLimitData: 0 },
  recentPayments: [],
  score: null,
};

const EMPTY_ADVISOR: CreditAdvisorResponse = { trend: [], azeo: null };

export default async function CreditPage() {
  const db = await getDb();

  const [summaryRes, advisorRes] = await Promise.all([
    handleGetCreditSummary(db),
    handleGetCreditAdvisor(db),
  ]);

  const summary = summaryRes.ok ? await summaryRes.json() as CreditSummaryResponse : EMPTY_SUMMARY;
  const advisor = advisorRes.ok ? await advisorRes.json() as CreditAdvisorResponse : EMPTY_ADVISOR;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Credit Health</h1>
          <p className="text-sm text-sky-700 mt-0.5">Credit utilization and payment activity</p>
        </div>
      </div>
      <CreditView initialData={summary} advisorData={advisor} />
    </div>
  );
}
