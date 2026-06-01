import type { PayPeriodComparison as ComparisonData } from '@/types/payPeriod';

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  comparison: ComparisonData;
}

function formatDelta(value: number, isCurrency: boolean, invertColor = false): { text: string; color: string } {
  if (Math.abs(value) < 0.5) {
    return { text: 'no change', color: 'var(--text3)' };
  }
  const sign = value > 0 ? '+' : '';
  const text = isCurrency ? `${sign}${USD0.format(value)}` : `${sign}${value.toFixed(1)}pp`;
  const isPositive = invertColor ? value < 0 : value > 0;
  return { text, color: isPositive ? 'var(--green)' : 'var(--red)' };
}

const rows: Array<{
  label: string;
  getValue: (c: ComparisonData) => string;
  getValueColor: (c: ComparisonData) => string;
  getDelta: (c: ComparisonData) => { text: string; color: string };
}> = [
  {
    label: 'Income',
    getValue: c => USD0.format(c.prevIncome + c.incomeDelta),
    getValueColor: () => 'var(--text)',
    getDelta: c => formatDelta(c.incomeDelta, true),
  },
  {
    label: 'Spending',
    getValue: c => USD0.format(c.prevSpent + c.spentDelta),
    getValueColor: () => 'var(--text)',
    getDelta: c => formatDelta(c.spentDelta, true, true),
  },
  {
    label: 'Safe to spend',
    getValue: c => USD0.format(c.prevSafeToSpend + c.safeToSpendDelta),
    getValueColor: c => (c.prevSafeToSpend + c.safeToSpendDelta) >= 0 ? 'var(--green)' : 'var(--red)',
    getDelta: c => formatDelta(c.safeToSpendDelta, true),
  },
  {
    label: 'Savings rate',
    getValue: c => `${(c.prevSavingsRate + c.savingsRateDelta).toFixed(1)}%`,
    getValueColor: () => 'var(--text)',
    getDelta: c => formatDelta(c.savingsRateDelta, false),
  },
];

export function PayPeriodComparisonCard({ comparison }: Props) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 24,
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>Period comparison</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, marginBottom: 20 }}>vs. previous pay period</div>
      {rows.map(row => {
        const delta = row.getDelta(comparison);
        return (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 0', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{row.label}</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500, color: row.getValueColor(comparison) }}>
                {row.getValue(comparison)}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, marginTop: 2, color: delta.color }}>
                {delta.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
