import type { BillSummary } from '@/types/bill';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface SummaryCardsProps {
  summary: BillSummary;
}

interface CardProps {
  label: string;
  value: string;
  accent: string;      // tailwind text color class
  subtext?: string;
  large?: boolean;
}

function Card({ label, value, accent, subtext, large }: CardProps) {
  return (
    <div className="rounded-xl p-4 border border-white/[0.06] bg-zinc-900 flex flex-col gap-1.5">
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`font-bold text-white leading-none tabular-nums ${large ? 'text-2xl' : 'text-xl'}`}>
        {value}
      </p>
      {subtext && <p className="text-[11px] text-zinc-600 mt-0.5">{subtext}</p>}
      <div className={`h-0.5 w-8 rounded-full mt-1 ${accent}`} />
    </div>
  );
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card
        label="Owed This Month"
        value={USD.format(summary.totalOwedThisMonth)}
        accent="bg-red-500"
      />
      <Card
        label="Paid"
        value={USD.format(summary.totalPaid)}
        accent="bg-emerald-500"
      />
      <Card
        label="Overdue"
        value={String(summary.overdueCount)}
        accent="bg-orange-500"
        subtext={summary.overdueCount === 0 ? 'All clear' : `${summary.overdueCount} bill${summary.overdueCount !== 1 ? 's' : ''} need attention`}
      />
      <Card
        label="AutoPay Total"
        value={USD.format(summary.autoPayTotal)}
        accent="bg-blue-500"
      />
    </div>
  );
}
