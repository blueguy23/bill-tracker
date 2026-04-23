'use client';

import type { CreditPaymentRecord } from '@/types/credit';

interface RecentPaymentsPanelProps {
  payments: CreditPaymentRecord[];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

function formatUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n));
}

export function RecentPaymentsPanel({ payments }: RecentPaymentsPanelProps) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Recent Payments</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 3 }}>Last 30 days</div>
      </div>

      {payments.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>No payments in the last 30 days</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {payments.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 20px', borderBottom: i < payments.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                  {p.orgName} · {p.accountName} · {formatDate(p.posted)}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                +{formatUSD(p.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
