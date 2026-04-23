import type { BillResponse, RecurrenceInterval } from '@/types/bill';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const ANNUAL_MULT: Record<RecurrenceInterval, number> = {
  weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1,
};

function monthlyEquiv(amount: number, interval: RecurrenceInterval): number {
  return (amount * ANNUAL_MULT[interval]) / 12;
}

const INTERVAL_LABEL: Record<RecurrenceInterval, string> = {
  weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
};

const INTERVAL_ORDER: RecurrenceInterval[] = ['monthly', 'weekly', 'biweekly', 'quarterly', 'yearly'];

interface RecurringStatsProps {
  bills: BillResponse[];
}

export function RecurringStats({ bills }: RecurringStatsProps) {
  const recurring = bills.filter((b) => b.isRecurring && b.recurrenceInterval);

  const monthlyTotal   = recurring.reduce((s, b) => s + monthlyEquiv(b.amount, b.recurrenceInterval!), 0);
  const annualTotal    = monthlyTotal * 12;
  const autoPayMonthly = recurring.filter((b) => b.isAutoPay).reduce((s, b) => s + monthlyEquiv(b.amount, b.recurrenceInterval!), 0);
  const manualMonthly  = monthlyTotal - autoPayMonthly;

  const byInterval = new Map<RecurrenceInterval, BillResponse[]>();
  for (const b of recurring) {
    const key = b.recurrenceInterval!;
    if (!byInterval.has(key)) byInterval.set(key, []);
    byInterval.get(key)!.push(b);
  }
  const orderedIntervals = INTERVAL_ORDER.filter((i) => byInterval.has(i));

  const metrics = [
    { label: 'MONTHLY COMMITTED', value: USD.format(monthlyTotal), sub: '/mo equiv', color: 'var(--accent)' },
    { label: 'ANNUAL PROJECTION', value: USD.format(annualTotal), sub: '/year', color: 'oklch(0.68 0.22 285)' },
    { label: 'AUTO-PAY TOTAL', value: USD.format(autoPayMonthly), sub: '/mo', color: 'var(--green)' },
    { label: 'MANUAL TOTAL', value: USD.format(manualMonthly), sub: '/mo', color: 'var(--gold)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {metrics.map(({ label, value, sub, color }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--mono)' }}>{label}</span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 300, color: 'var(--text)', lineHeight: 1, letterSpacing: '-.01em' }}>{value}</div>
            {sub && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Interval breakdown */}
      {orderedIntervals.map((interval) => {
        const group        = byInterval.get(interval)!;
        const groupMonthly = group.reduce((s, b) => s + monthlyEquiv(b.amount, interval), 0);
        return (
          <div key={interval} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{INTERVAL_LABEL[interval]}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>({group.length} bill{group.length !== 1 ? 's' : ''})</span>
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500, color: 'var(--text2)' }}>
                {USD.format(groupMonthly)}{interval !== 'monthly' ? '/mo equiv' : '/mo'}
              </span>
            </div>
            {group.map((b, i) => (
              <div key={b._id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                borderBottom: i < group.length - 1 ? '1px solid var(--border)' : 'none',
                fontSize: 13,
              }}>
                <span style={{ flex: 1, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{b.name}</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)', fontWeight: 500, minWidth: 80, textAlign: 'right' }}>{USD.format(b.amount)}</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--text3)', fontSize: 11, minWidth: 50, textAlign: 'right' }}>
                  {typeof b.dueDate === 'number' ? `Day ${b.dueDate}` : '—'}
                </span>
                <span style={{ minWidth: 60, textAlign: 'right' }}>
                  {b.isAutoPay
                    ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'rgba(34,197,94,.12)', color: 'var(--green)', fontFamily: 'var(--mono)' }}>AUTO</span>
                    : <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>—</span>
                  }
                </span>
                {interval !== 'monthly' && (
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text3)', fontSize: 11, minWidth: 70, textAlign: 'right' }}>
                    {USD.format(monthlyEquiv(b.amount, interval))}/mo
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
