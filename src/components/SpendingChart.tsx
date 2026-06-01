import type { BillCategory } from '@/types/bill';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const CATEGORY_LABELS: Record<BillCategory, string> = {
  utilities: 'Utilities',
  subscriptions: 'Subscriptions',
  insurance: 'Insurance',
  rent: 'Rent / Housing',
  loans: 'Loans',
  other: 'Other',
};

const CATEGORY_COLORS: Record<BillCategory, string> = {
  utilities: '#60a5fa',   // blue-400
  subscriptions: '#a78bfa', // violet-400
  insurance: '#34d399',   // emerald-400
  rent: '#f97316',        // orange-500
  loans: '#f43f5e',       // rose-500
  other: '#a1a1aa',       // zinc-400
};

export interface SpendingByCategory {
  category: BillCategory;
  amount: number;
}

interface SpendingChartProps {
  data: SpendingByCategory[];
}

export function SpendingChart({ data }: SpendingChartProps) {
  const sorted = [...data].sort((a, b) => b.amount - a.amount).filter((d) => d.amount > 0);
  const max = sorted[0]?.amount ?? 0;

  if (sorted.length === 0) {
    return (
      <div
        className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5"
        data-testid="spending-chart"
      >
        <h3 className="text-sm font-semibold text-white mb-4">Spending by Category</h3>
        <p className="text-sm text-zinc-500">No bill data yet.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5"
      data-testid="spending-chart"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Spending by Category</h3>
        <span className="text-xs text-zinc-500">Monthly bills</span>
      </div>

      <div className="space-y-3">
        {sorted.map(({ category, amount }) => {
          const barWidth = max > 0 ? (amount / max) * 100 : 0;
          return (
            <div key={category} data-testid={`spending-row-${category}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-400">{CATEGORY_LABELS[category]}</span>
                <span className="text-xs font-medium text-zinc-200 tabular-nums">
                  {USD.format(amount)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: CATEGORY_COLORS[category],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
