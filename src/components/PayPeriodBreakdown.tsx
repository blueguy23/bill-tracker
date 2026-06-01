import type { PayPeriodStats } from '@/types/payPeriod';

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  stats: PayPeriodStats;
}

const cells: Array<{
  label: string;
  getValue: (s: PayPeriodStats) => string;
  getColor: (s: PayPeriodStats) => string;
  getSub: (s: PayPeriodStats) => string;
}> = [
  {
    label: 'Income',
    getValue: s => USD0.format(s.income),
    getColor: () => 'var(--green)',
    getSub: s => `${s.transactionCount > 0 ? '1 paycheck' : 'no income yet'}`,
  },
  {
    label: 'Spent',
    getValue: s => USD0.format(s.spent),
    getColor: () => 'var(--text)',
    getSub: s => `${s.transactionCount} transactions`,
  },
  {
    label: 'Bills due',
    getValue: s => USD0.format(s.billsDue),
    getColor: () => 'var(--gold)',
    getSub: s => `${s.billsDueCount} remaining`,
  },
  {
    label: 'Remaining',
    getValue: s => USD0.format(s.remaining),
    getColor: () => 'var(--text)',
    getSub: () => 'before bills',
  },
];

export function PayPeriodBreakdown({ stats }: Props) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px',
      background: 'var(--border)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden', marginBottom: 12,
    }}>
      {cells.map(cell => (
        <div key={cell.label} style={{ background: 'var(--surface)', padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', marginBottom: 8 }}>{cell.label}</div>
          <div style={{
            fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)',
            letterSpacing: -0.5, color: cell.getColor(stats),
          }}>
            {cell.getValue(stats)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 4 }}>
            {cell.getSub(stats)}
          </div>
        </div>
      ))}
    </div>
  );
}
