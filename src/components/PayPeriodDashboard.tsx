import type { PayPeriodDashboardData, CategorySpend } from '@/types/payPeriod';
import { SafeToSpendHero } from './SafeToSpendHero';
import { PayPeriodBreakdown } from './PayPeriodBreakdown';
import { PayPeriodBalanceChart } from './PayPeriodBalanceChart';
import { PayPeriodTimeline } from './PayPeriodTimeline';
import { PayPeriodComparisonCard } from './PayPeriodComparison';

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  data: PayPeriodDashboardData;
}

function SpendingByCategory({ categories }: { categories: CategorySpend[] }) {
  const sorted = [...categories].sort((a, b) => b.amount - a.amount).slice(0, 6);
  const max = sorted[0]?.amount ?? 0;

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 24,
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>Spending by category</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, marginBottom: 20 }}>This pay period</div>
      {sorted.length === 0 ? (
        <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textAlign: 'center', padding: '24px 0' }}>
          No spending data yet
        </p>
      ) : (
        sorted.map(cat => (
          <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', minWidth: 90 }}>{cat.label}</div>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, width: max > 0 ? `${(cat.amount / max) * 100}%` : '0%', background: '#a1a1aa' }} />
            </div>
            <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)', textAlign: 'right', minWidth: 48 }}>
              {USD0.format(cat.amount)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function PayPeriodDashboard({ data }: Props) {
  return (
    <>
      <SafeToSpendHero stats={data.stats} period={data.period} />
      <PayPeriodBreakdown stats={data.stats} />
      <PayPeriodBalanceChart dailyBalances={data.dailyBalances} />
      <PayPeriodTimeline
        period={data.period}
        events={data.upcomingEvents}
        balanceWarning={data.balanceWarning}
        nextPayday={data.nextPayday}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <SpendingByCategory categories={data.categorySpend} />
        {data.comparison && <PayPeriodComparisonCard comparison={data.comparison} />}
      </div>
    </>
  );
}
