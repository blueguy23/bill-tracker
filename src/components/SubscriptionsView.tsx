'use client';

import { useState } from 'react';
import type { DetectedSubscriptionResponse } from '@/types/subscription';
import type { RecurrenceInterval } from '@/types/bill';

interface Props {
  initialSubscriptions: DetectedSubscriptionResponse[];
}

const INTERVAL_TO_RECURRENCE: Record<string, RecurrenceInterval> = {
  weekly: 'weekly', biweekly: 'biweekly', monthly: 'monthly', quarterly: 'quarterly',
};

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function usd(n: number) { return USD.format(n); }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function monthlyAmount(sub: DetectedSubscriptionResponse): number {
  if (sub.interval === 'weekly')    return sub.amount * 4;
  if (sub.interval === 'biweekly')  return sub.amount * 2;
  if (sub.interval === 'quarterly') return sub.amount / 3;
  return sub.amount;
}

function SubRow({ sub, isConverting, isDismissing, onConvert, onDismiss }: {
  sub: DetectedSubscriptionResponse;
  isConverting: boolean; isDismissing: boolean;
  onConvert: (s: DetectedSubscriptionResponse) => void;
  onDismiss: (id: string) => void;
}) {
  const [hov, setHov] = useState(false);
  const mo = monthlyAmount(sub);

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      data-testid="sub-row"
      style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 100px 150px', padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.1s', background: hov ? 'rgba(255,255,255,0.02)' : 'transparent' }}
    >
      <div style={{ width: 28, height: 28, background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text3)', flexShrink: 0 }}>
        {sub.normalizedName.charAt(0).toUpperCase()}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.normalizedName}</div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{sub.suggestedCategory} · Next: {fmtDate(sub.nextEstimated)}</div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{sub.interval}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, color: 'var(--text)', textAlign: 'right' }}>
        {usd(mo)}/mo
        {sub.interval === 'quarterly' && (
          <div style={{ fontSize: 9, color: 'var(--accent)', marginTop: 2 }}>amortised</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', opacity: hov ? 1 : 0, transition: 'opacity .1s' }}>
        <button
          onClick={() => onConvert(sub)} disabled={isConverting || isDismissing}
          style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: isConverting || isDismissing ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, opacity: isConverting || isDismissing ? 0.6 : 1 }}
        >
          {isConverting ? '…' : '+ Add'}
        </button>
        <button
          onClick={() => onDismiss(sub.id)} disabled={isConverting || isDismissing}
          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-l)', background: 'transparent', color: 'var(--text3)', cursor: isConverting || isDismissing ? 'not-allowed' : 'pointer', fontSize: 11, opacity: isConverting || isDismissing ? 0.5 : 1 }}
        >
          {isDismissing ? '…' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}

export function SubscriptionsView({ initialSubscriptions }: Props) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [converting, setConverting]       = useState<string | null>(null);
  const [dismissing, setDismissing]       = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);

  async function handleConvert(sub: DetectedSubscriptionResponse) {
    setConverting(sub.id); setError(null);
    try {
      const res = await fetch('/api/v1/bills', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sub.normalizedName, amount: sub.amount,
          dueDate: new Date(sub.lastCharged).getDate(),
          category: sub.suggestedCategory, isRecurring: true,
          recurrenceInterval: INTERVAL_TO_RECURRENCE[sub.interval] ?? 'monthly',
          isAutoPay: true, isPaid: false,
        }),
      });
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? 'Failed'); }
      setSubscriptions(prev => prev.filter(s => s.id !== sub.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bill');
    } finally { setConverting(null); }
  }

  async function handleDismiss(id: string) {
    setDismissing(id); setError(null);
    try {
      const res = await fetch('/api/v1/subscriptions/dismiss', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      });
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? 'Failed'); }
      setSubscriptions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss');
    } finally { setDismissing(null); }
  }

  const totalMonthly   = subscriptions.reduce((s, sub) => s + monthlyAmount(sub), 0);
  const totalAnnual    = totalMonthly * 12;
  const committed      = subscriptions.filter(s => s.confidence === 'high');
  const cuttable       = subscriptions.filter(s => s.confidence !== 'high');
  const committedTotal = committed.reduce((s, sub) => s + monthlyAmount(sub), 0);
  const cuttableTotal  = cuttable.reduce((s, sub) => s + monthlyAmount(sub), 0);

  if (subscriptions.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--sans)', marginBottom: 6 }}>No subscriptions detected</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>Sync more transaction history to detect recurring patterns.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* KPI card */}
      <div data-testid="sub-total-kpi" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '2px solid var(--gold)', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text3)' }}>Total Subscription Spend</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: 'var(--gold)', letterSpacing: '-1px' }}>{usd(totalMonthly)}/mo</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{usd(totalAnnual)} annualised · {subscriptions.length} detected</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Committed: <span style={{ color: 'var(--text2)' }}>{usd(committedTotal)}/mo</span></div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Cuttable: <span style={{ color: 'var(--gold)' }}>{usd(cuttableTotal)}/mo</span></div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: 'var(--red)', fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>{error}</div>
      )}

      {/* Committed section */}
      {committed.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 6 }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)' }}>Committed — high confidence</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{usd(committedTotal)}/mo</span>
          </div>
          <div data-testid="committed-list" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {committed.map(sub => (
              <SubRow key={sub.id} sub={sub} isConverting={converting === sub.id} isDismissing={dismissing === sub.id}
                onConvert={sub => void handleConvert(sub)} onDismiss={id => void handleDismiss(id)} />
            ))}
          </div>
        </div>
      )}

      {/* Cuttable section */}
      {cuttable.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 6 }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)' }}>Cuttable — cancel anytime</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--gold)' }}>{usd(cuttableTotal)}/mo</span>
          </div>
          <div data-testid="cuttable-list" style={{ background: 'var(--surface)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'rgba(245,158,11,0.05)', borderBottom: '1px solid rgba(245,158,11,0.12)', fontSize: 11, color: 'var(--gold)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              These can be cancelled at any time — {usd(cuttableTotal)}/mo you could recover
            </div>
            {cuttable.map(sub => (
              <SubRow key={sub.id} sub={sub} isConverting={converting === sub.id} isDismissing={dismissing === sub.id}
                onConvert={sub => void handleConvert(sub)} onDismiss={id => void handleDismiss(id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
