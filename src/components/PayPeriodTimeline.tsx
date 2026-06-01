import type { PayPeriodBounds, PayPeriodEvent } from '@/types/payPeriod';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface Props {
  period: PayPeriodBounds;
  events: PayPeriodEvent[];
  balanceWarning: string | null;
  nextPayday: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PayPeriodTimeline({ period, events, balanceWarning, nextPayday }: Props) {
  const progressPct = Math.min((period.dayNumber / period.totalDays) * 100, 100);

  const billMarkers = events
    .filter(e => e.type === 'bill')
    .map(e => {
      const dayInPeriod = Math.round((e.date.getTime() - period.start.getTime()) / (24 * 60 * 60 * 1000));
      return { pct: (dayInPeriod / period.totalDays) * 100, name: e.name };
    });

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 28, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.2 }}>Timeline</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Upcoming bills and income</div>
        </div>
        {nextPayday && (
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            Next paycheck: {nextPayday}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
          <div style={{ height: '100%', borderRadius: 2, background: 'var(--text3)', width: `${progressPct}%`, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: -5, right: -7, width: 14, height: 14,
              borderRadius: '50%', background: 'var(--text)', border: '2px solid var(--bg)',
              boxShadow: '0 0 0 2px rgba(255,255,255,0.1)', zIndex: 3,
            }} />
          </div>
          {billMarkers.map((m, i) => (
            <div key={i} style={{
              position: 'absolute', top: -3, left: `${m.pct}%`, width: 10, height: 10,
              borderRadius: '50%', background: 'var(--gold)', border: '2px solid var(--bg)',
              transform: 'translateX(-50%)', zIndex: 2,
            }} />
          ))}
          <div style={{
            position: 'absolute', top: -3, right: 0, width: 10, height: 10,
            borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--bg)', zIndex: 2,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{formatDate(period.start)}</span>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text2)', fontWeight: 500 }}>Today</span>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--green)' }}>{formatDate(period.end)}</span>
        </div>
      </div>

      {/* Balance warning */}
      {balanceWarning && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 16px', borderRadius: 8,
          background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.1)',
          fontSize: 12, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.5,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{balanceWarning}</span>
        </div>
      )}

      {/* Events list */}
      {events.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', marginBottom: 4, marginTop: balanceWarning ? 0 : 24 }}>
            Upcoming
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {events.map((evt, i) => {
              const isIncome = evt.type === 'income';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', padding: '14px 0',
                  borderBottom: i < events.length - 1 ? '1px solid var(--border)' : 'none', gap: 16,
                }}>
                  <div style={{ width: 44, flexShrink: 0, textAlign: 'center' }}>
                    <div style={{
                      fontSize: 16, fontWeight: 600, fontFamily: 'var(--mono)',
                      color: isIncome ? 'var(--green)' : 'var(--text2)', lineHeight: 1,
                    }}>
                      {evt.date.getDate()}
                    </div>
                    <div style={{
                      fontSize: 9, fontWeight: 500, fontFamily: 'var(--mono)',
                      color: 'var(--text3)', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.5,
                    }}>
                      {evt.date.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>
                  <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{evt.name}</div>
                    {evt.detail && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{evt.detail}</div>}
                  </div>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, flexShrink: 0,
                    color: isIncome ? 'var(--green)' : 'var(--text2)',
                  }}>
                    {isIncome ? '+' : '−'}{USD.format(evt.amount)}
                  </div>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 11, flexShrink: 0, textAlign: 'right', minWidth: 72,
                    color: evt.projectedBalance < 100 ? 'var(--gold)' : isIncome ? 'var(--green)' : 'var(--text3)',
                  }}>
                    bal {USD.format(evt.projectedBalance)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
