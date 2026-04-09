import type { SummaryResponse } from '@/app/api/v1/summary/route';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  fromColor: string;
  dotColor: string;
  valueColor?: string;
}

function StatCard({ label, value, sub, fromColor, dotColor, valueColor = 'text-white' }: StatCardProps) {
  return (
    <div className={`rounded-xl p-5 border border-white/[0.06] bg-gradient-to-br ${fromColor} to-zinc-900`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-[1.75rem] font-bold leading-none tracking-tight ${valueColor}`}>{value}</p>
      {sub && <p className="mt-2 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

interface SpendingSectionProps {
  data: SummaryResponse;
}

export function SpendingSection({ data }: SpendingSectionProps) {
  const { income, expenses, net, transactionCount, topMerchants } = data;
  const netPositive = net >= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actual Spending</h3>
        <span className="text-xs text-zinc-600">from transactions</span>
      </div>

      {/* Stat cards — stacked on mobile, 3-col on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Cash In"
          value={USD.format(income)}
          fromColor="from-emerald-500/[0.12]"
          dotColor="bg-emerald-500"
          valueColor="text-emerald-400"
        />
        <StatCard
          label="Cash Out"
          value={USD.format(expenses)}
          sub={`${transactionCount} transactions`}
          fromColor="from-red-500/[0.12]"
          dotColor="bg-red-500"
          valueColor="text-red-400"
        />
        <StatCard
          label="Net"
          value={`${netPositive ? '+' : ''}${USD.format(net)}`}
          sub={netPositive ? 'saved this month' : 'spent more than earned'}
          fromColor={netPositive ? 'from-blue-500/[0.12]' : 'from-orange-500/[0.12]'}
          dotColor={netPositive ? 'bg-blue-500' : 'bg-orange-500'}
          valueColor={netPositive ? 'text-blue-400' : 'text-orange-400'}
        />
      </div>

      {/* Top merchants */}
      {topMerchants.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06]">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Top Spending</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-white/[0.03]">
                {topMerchants.map((m, i) => (
                  <tr key={m.merchant} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-zinc-600 text-xs tabular-nums w-8">{i + 1}</td>
                    <td className="px-5 py-3 text-zinc-200">{m.merchant}</td>
                    <td className="px-5 py-3 text-right font-medium text-white tabular-nums">
                      {USD.format(m.total)}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-500 text-xs whitespace-nowrap tabular-nums">
                      {m.count} charge{m.count !== 1 ? 's' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
