import type { BillResponse, RecurrenceInterval } from '@/types/bill';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Annual multipliers: how many times per year each interval fires
const ANNUAL_MULT: Record<RecurrenceInterval, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

function monthlyEquiv(amount: number, interval: RecurrenceInterval): number {
  return (amount * ANNUAL_MULT[interval]) / 12;
}

function annualEquiv(amount: number, interval: RecurrenceInterval): number {
  return amount * ANNUAL_MULT[interval];
}

const INTERVAL_LABEL: Record<RecurrenceInterval, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const INTERVAL_ORDER: RecurrenceInterval[] = ['monthly', 'weekly', 'biweekly', 'quarterly', 'yearly'];

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  fromColor: string;
  dotColor: string;
}

function StatCard({ label, value, sub, fromColor, dotColor }: StatCardProps) {
  return (
    <div className={`rounded-xl p-5 border border-white/[0.06] bg-gradient-to-br ${fromColor} to-zinc-900`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-[1.75rem] font-bold text-white leading-none tracking-tight">{value}</p>
      {sub && <p className="mt-2 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

interface RecurringStatsProps {
  bills: BillResponse[];
}

export function RecurringStats({ bills }: RecurringStatsProps) {
  // Only include recurring bills with a known interval
  const recurring = bills.filter((b) => b.isRecurring && b.recurrenceInterval);

  // Monthly committed = sum of monthly equivalents across all intervals
  const monthlyTotal = recurring.reduce(
    (sum, b) => sum + monthlyEquiv(b.amount, b.recurrenceInterval!),
    0,
  );
  const annualTotal = monthlyTotal * 12;

  const autoPayMonthly = recurring
    .filter((b) => b.isAutoPay)
    .reduce((sum, b) => sum + monthlyEquiv(b.amount, b.recurrenceInterval!), 0);

  const manualMonthly = monthlyTotal - autoPayMonthly;

  // Group by interval, only intervals that are present
  const byInterval = new Map<RecurrenceInterval, BillResponse[]>();
  for (const b of recurring) {
    const key = b.recurrenceInterval!;
    if (!byInterval.has(key)) byInterval.set(key, []);
    byInterval.get(key)!.push(b);
  }

  const orderedIntervals = INTERVAL_ORDER.filter((i) => byInterval.has(i));

  return (
    <div className="space-y-6">
      {/* Stat cards — 2-col on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Monthly Committed"
          value={USD.format(monthlyTotal)}
          sub="/mo equiv"
          fromColor="from-blue-500/[0.12]"
          dotColor="bg-blue-500"
        />
        <StatCard
          label="Annual Projection"
          value={USD.format(annualTotal)}
          sub="/year"
          fromColor="from-violet-500/[0.12]"
          dotColor="bg-violet-500"
        />
        <StatCard
          label="Auto-Pay Total"
          value={USD.format(autoPayMonthly)}
          sub="/mo"
          fromColor="from-emerald-500/[0.12]"
          dotColor="bg-emerald-500"
        />
        <StatCard
          label="Manual Total"
          value={USD.format(manualMonthly)}
          sub="/mo"
          fromColor="from-orange-500/[0.12]"
          dotColor="bg-orange-500"
        />
      </div>

      {/* Interval breakdown */}
      {orderedIntervals.map((interval) => {
        const group = byInterval.get(interval)!;
        const groupMonthly = group.reduce(
          (sum, b) => sum + monthlyEquiv(b.amount, interval),
          0,
        );
        const suffix = interval === 'monthly'
          ? '/mo'
          : `${USD.format(groupMonthly)}/mo equiv`;

        return (
          <div key={interval} className="rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">{INTERVAL_LABEL[interval]}</h3>
                <span className="text-xs text-zinc-500">({group.length} bill{group.length !== 1 ? 's' : ''})</span>
              </div>
              <span className="text-sm font-semibold text-zinc-300 tabular-nums">
                {interval === 'monthly' ? USD.format(groupMonthly) : suffix}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                    <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Due Day</th>
                    <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">AutoPay</th>
                    {interval !== 'monthly' && (
                      <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Mo. Equiv</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {group.map((b) => (
                    <tr key={b._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-zinc-200">{b.name}</td>
                      <td className="px-5 py-3 text-right font-medium text-white tabular-nums">
                        {USD.format(b.amount)}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-500 hidden sm:table-cell">
                        {typeof b.dueDate === 'number' ? `Day ${b.dueDate}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right hidden sm:table-cell">
                        {b.isAutoPay
                          ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">AutoPay</span>
                          : <span className="text-zinc-600 text-xs">—</span>
                        }
                      </td>
                      {interval !== 'monthly' && (
                        <td className="px-5 py-3 text-right text-zinc-500 text-xs tabular-nums hidden sm:table-cell">
                          {USD.format(monthlyEquiv(b.amount, interval))}/mo
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
