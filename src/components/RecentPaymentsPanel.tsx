'use client';

import type { CreditPaymentRecord } from '@/types/credit';

interface RecentPaymentsPanelProps {
  payments: CreditPaymentRecord[];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

function formatUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n));
}

export function RecentPaymentsPanel({ payments }: RecentPaymentsPanelProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <p className="text-sm font-semibold text-white">Recent Payments</p>
        <p className="text-xs text-zinc-500 mt-0.5">Last 30 days</p>
      </div>

      {payments.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-zinc-500">No payments in the last 30 days</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {payments.map((p) => (
            <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{p.description}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {p.orgName} · {p.accountName} · {formatDate(p.posted)}
                </p>
              </div>
              <p className="text-sm font-semibold text-emerald-400 shrink-0">
                +{formatUSD(p.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
