import type { CashFlow } from '@/adapters/accounts';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface CashFlowCardProps {
  cashFlow: CashFlow;
}

export function CashFlowCard({ cashFlow }: CashFlowCardProps) {
  const { income, expenses, net } = cashFlow;
  const total = income + expenses;
  const incomePercent = total > 0 ? (income / total) * 100 : 50;
  const expensesPercent = total > 0 ? (expenses / total) * 100 : 50;

  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-zinc-900 p-5"
      data-testid="cash-flow-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Cash Flow</h3>
        <span className="text-xs text-zinc-500">This month</span>
      </div>

      {/* Income vs Expenses bar */}
      <div className="flex rounded-full overflow-hidden h-2 mb-4" data-testid="cash-flow-bar">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${incomePercent}%` }}
          title={`Income: ${USD.format(income)}`}
        />
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${expensesPercent}%` }}
          title={`Expenses: ${USD.format(expenses)}`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Income</p>
          </div>
          <p className="text-sm font-semibold text-emerald-400 tabular-nums" data-testid="cash-flow-income">
            {USD.format(income)}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Expenses</p>
          </div>
          <p className="text-sm font-semibold text-red-400 tabular-nums" data-testid="cash-flow-expenses">
            {USD.format(expenses)}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Net</p>
          <p
            className={`text-sm font-semibold tabular-nums ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
            data-testid="cash-flow-net"
          >
            {net >= 0 ? '+' : ''}{USD.format(net)}
          </p>
        </div>
      </div>
    </div>
  );
}
