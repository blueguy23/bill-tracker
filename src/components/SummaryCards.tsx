import type { BillSummary } from '@/types/bill';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface SummaryCardsProps {
  summary: BillSummary;
}

interface CardProps {
  label: string;
  value: string;
  fromColor: string;
  dotColor: string;
  subtext?: string;
}

function Card({ label, value, fromColor, dotColor, subtext }: CardProps) {
  return (
    <div className={`rounded-xl p-5 border border-white/[0.06] bg-gradient-to-br ${fromColor} to-zinc-900`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-[1.75rem] font-bold text-white leading-none tracking-tight">{value}</p>
      {subtext && <p className="mt-2 text-xs text-zinc-600">{subtext}</p>}
    </div>
  );
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card
        label="Owed This Month"
        value={USD.format(summary.totalOwedThisMonth)}
        fromColor="from-red-500/[0.12]"
        dotColor="bg-red-500"
      />
      <Card
        label="Paid"
        value={USD.format(summary.totalPaid)}
        fromColor="from-emerald-500/[0.12]"
        dotColor="bg-emerald-500"
      />
      <Card
        label="Overdue"
        value={String(summary.overdueCount)}
        fromColor="from-orange-500/[0.12]"
        dotColor="bg-orange-500"
        subtext={summary.overdueCount === 0 ? "All clear" : summary.overdueCount === 1 ? "1 bill needs attention" : `${summary.overdueCount} bills need attention`}
      />
      <Card
        label="AutoPay Total"
        value={USD.format(summary.autoPayTotal)}
        fromColor="from-blue-500/[0.12]"
        dotColor="bg-blue-500"
      />
    </div>
  );
}
