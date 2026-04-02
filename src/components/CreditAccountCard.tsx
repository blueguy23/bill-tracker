'use client';

import type { CreditAccountSummary } from '@/types/credit';

interface CreditAccountCardProps {
  account: CreditAccountSummary;
}

function utilizationColor(util: number): { bar: string; text: string } {
  if (util < 0.30) return { bar: 'bg-emerald-500', text: 'text-emerald-400' };
  if (util <= 0.70) return { bar: 'bg-amber-500', text: 'text-amber-400' };
  return { bar: 'bg-red-500', text: 'text-red-400' };
}

function formatUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function CreditAccountCard({ account }: CreditAccountCardProps) {
  const { bar, text } = account.utilization !== null
    ? utilizationColor(account.utilization)
    : { bar: '', text: '' };

  const utilizationPct = account.utilization !== null
    ? `${Math.round(account.utilization * 100)}%`
    : null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5 flex flex-col gap-3">
      <div>
        <p className="text-[11px] text-zinc-500 font-medium">{account.orgName}</p>
        <p className="text-sm font-semibold text-white mt-0.5">{account.name}</p>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-zinc-500">Balance</p>
          <p className="text-xl font-bold text-white">{formatUSD(account.balance)}</p>
        </div>
        {account.hasLimitData && account.creditLimit !== null && (
          <div className="text-right">
            <p className="text-xs text-zinc-500">Limit</p>
            <p className="text-sm text-zinc-400">{formatUSD(account.creditLimit)}</p>
          </div>
        )}
      </div>

      {account.hasLimitData && account.utilization !== null ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">Utilization</p>
            <p className={`text-xs font-semibold ${text}`}>{utilizationPct}</p>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${bar}`}
              style={{ width: `${Math.min(100, Math.round((account.utilization) * 100))}%` }}
            />
          </div>
        </div>
      ) : (
        <span className="self-start text-[11px] font-medium text-zinc-500 bg-zinc-800 rounded-full px-2.5 py-1">
          No limit data
        </span>
      )}
    </div>
  );
}
