'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { PayPeriodBounds } from '@/types/payPeriod';

interface Props {
  period: PayPeriodBounds;
  activeView: 'payperiod' | 'monthly';
  offset: number;
}

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = start.toLocaleDateString('en-US', opts);
  const e = end.toLocaleDateString('en-US', opts);
  return `${s} – ${e}`;
}

export function PayPeriodHeader({ period, activeView, offset }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(newOffset: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'payperiod');
    params.set('offset', String(newOffset));
    router.push(`/?${params.toString()}`);
  }

  function switchView(view: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    if (view === 'monthly') params.delete('offset');
    router.push(`/?${params.toString()}`);
  }

  const isCurrentPeriod = offset === 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => navigate(offset - 1)}
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text3)', cursor: 'pointer',
          }}
          aria-label="Previous period"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>
              {formatDateRange(period.start, period.end)}
            </span>
            {period.isActive && (
              <span style={{
                display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                fontSize: 10, fontWeight: 500, fontFamily: 'var(--mono)',
                background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)',
                color: 'var(--green)',
              }}>
                Active
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
            Day {period.dayNumber} of {period.totalDays} · {period.daysLeft} days left
          </div>
        </div>
        <button
          onClick={() => navigate(offset + 1)}
          disabled={isCurrentPeriod}
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text3)', cursor: isCurrentPeriod ? 'not-allowed' : 'pointer',
            opacity: isCurrentPeriod ? 0.25 : 1,
          }}
          aria-label="Next period"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <div style={{
        display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 3, gap: 2,
      }}>
        {(['payperiod', 'monthly'] as const).map(v => (
          <button
            key={v}
            onClick={() => switchView(v)}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', border: 'none', fontFamily: 'var(--sans)',
              background: activeView === v ? 'var(--raised)' : 'transparent',
              color: activeView === v ? 'var(--text)' : 'var(--text3)',
              boxShadow: activeView === v ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {v === 'payperiod' ? 'Pay Period' : 'Monthly'}
          </button>
        ))}
      </div>
    </div>
  );
}
