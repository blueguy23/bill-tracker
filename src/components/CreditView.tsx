'use client';

import type { CreditSummaryResponse } from '@/types/credit';
import type { CreditAdvisorResponse } from '@/types/creditAdvisor';
import { CreditAccountCard } from './CreditAccountCard';
import { RecentPaymentsPanel } from './RecentPaymentsPanel';
import { CreditAdvisorPanel } from './CreditAdvisorPanel';

interface CreditViewProps {
  initialData: CreditSummaryResponse;
  advisorData: CreditAdvisorResponse;
}

function formatUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function utilizationColor(util: number | null): string {
  if (util === null) return 'text-zinc-400';
  if (util < 0.30) return 'text-emerald-400';
  if (util <= 0.70) return 'text-amber-400';
  return 'text-red-400';
}

export function CreditView({ initialData, advisorData }: CreditViewProps) {
  const { accounts, overall, recentPayments } = initialData;

  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-8 text-center space-y-2">
        <p className="text-sm font-semibold text-zinc-300">No credit accounts found</p>
        <p className="text-sm text-zinc-500">
          Make sure SimpleFIN sync is configured and at least one credit card account has been synced.
        </p>
      </div>
    );
  }

  const utilPct = overall.utilization !== null
    ? `${Math.round(overall.utilization * 100)}%`
    : '—';

  return (
    <div className="space-y-6">
      {/* Overall utilization */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5 flex flex-col gap-1">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Overall Utilization</p>
        <p className={`text-4xl font-bold ${utilizationColor(overall.utilization)}`}>{utilPct}</p>
        <p className="text-sm text-zinc-500">
          {formatUSD(overall.totalBalance)} of {overall.accountsWithLimitData > 0 ? formatUSD(overall.totalLimit) : 'unknown limit'}
        </p>
      </div>

      {/* Account cards */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Credit Accounts ({accounts.length})
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <CreditAccountCard key={a.id} account={a} />
          ))}
        </div>
      </div>

      {/* Recent payments */}
      <RecentPaymentsPanel payments={recentPayments} />

      {/* Advisor panel */}
      <CreditAdvisorPanel data={advisorData} />
    </div>
  );
}
