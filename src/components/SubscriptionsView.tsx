'use client';

import { useState } from 'react';
import type { DetectedSubscriptionResponse, RecurringType } from '@/types/subscription';
import type { BillResponse } from '@/types/bill';

interface Props {
  pendingSubscriptions: DetectedSubscriptionResponse[];
  trackedBills: BillResponse[];
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
function usd(n: number) { return USD.format(n); }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function monthlyFromInterval(amount: number, interval: string): number {
  if (interval === 'weekly')    return amount * 4;
  if (interval === 'biweekly')  return amount * 2;
  if (interval === 'quarterly') return amount / 3;
  if (interval === 'yearly')    return amount / 12;
  return amount;
}

// ─── Type badge (only shown for bill / recurring — subscription is implied on this page) ─

const TYPE_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  bill:      { label: 'Bill',      color: 'var(--gold)',  bg: 'oklch(0.67 0.13 40 / 0.1)', border: 'oklch(0.67 0.13 40 / 0.3)' },
  recurring: { label: 'Recurring?', color: 'var(--text3)', bg: 'rgba(255,255,255,0.04)',    border: 'var(--border-l)'            },
};

function TypeBadge({ type, confidence }: { type: RecurringType; confidence: string }) {
  if (type === 'subscription') return null;
  const b = (TYPE_BADGE[type] ?? TYPE_BADGE['recurring'])!;
  return (
    <span title={`${type} (${confidence} confidence) · signals: see Payments tab`} style={{ fontSize: 9, fontWeight: 700, color: b.color, background: b.bg, border: `1px solid ${b.border}`, borderRadius: 4, padding: '1px 5px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {b.label}
    </span>
  );
}

// ─── Pending row ──────────────────────────────────────────────────────────────

function PendingRow({ sub, isConfirming, isDismissing, onConfirm, onDismiss }: {
  sub: DetectedSubscriptionResponse;
  isConfirming: boolean; isDismissing: boolean;
  onConfirm: (s: DetectedSubscriptionResponse) => void;
  onDismiss: (id: string) => void;
}) {
  const [hov, setHov] = useState(false);
  const mo = monthlyFromInterval(sub.amount, sub.interval);

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      data-testid="pending-sub-row"
      style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 110px 160px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.1s', background: hov ? 'rgba(255,255,255,0.02)' : 'transparent' }}
    >
      <div style={{ width: 28, height: 28, background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text3)', flexShrink: 0 }}>
        {sub.normalizedName.charAt(0).toUpperCase()}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.normalizedName}</span>
          <TypeBadge type={sub.recurringType} confidence={sub.typeConfidence} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          {sub.occurrences}× · Next: {fmtDate(sub.nextEstimated)}
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'capitalize' }}>{sub.interval}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, color: 'var(--text)', textAlign: 'right' }}>
        {usd(mo)}/mo
        {sub.interval !== 'monthly' && (
          <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{usd(sub.amount)} / charge</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', opacity: hov ? 1 : 0, transition: 'opacity .1s' }}>
        <button
          onClick={() => onConfirm(sub)} disabled={isConfirming || isDismissing}
          style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: isConfirming || isDismissing ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, opacity: isConfirming || isDismissing ? 0.6 : 1 }}
        >
          {isConfirming ? '…' : sub.recurringType === 'bill' ? 'Add as bill' : 'Yes, track it'}
        </button>
        <button
          onClick={() => onDismiss(sub.id)} disabled={isConfirming || isDismissing}
          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-l)', background: 'transparent', color: 'var(--text3)', cursor: isConfirming || isDismissing ? 'not-allowed' : 'pointer', fontSize: 11, opacity: isConfirming || isDismissing ? 0.5 : 1 }}
        >
          {isDismissing ? '…' : 'Not a sub'}
        </button>
      </div>
    </div>
  );
}

// ─── Tracked bill row ─────────────────────────────────────────────────────────

function TrackedRow({ bill }: { bill: BillResponse }) {
  const [hov, setHov] = useState(false);
  const mo  = monthlyFromInterval(bill.amount, bill.recurrenceInterval ?? 'monthly');
  const priceUp = bill.lastChargedAmount !== undefined && Math.abs(bill.lastChargedAmount - bill.amount) > 0.5;

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      data-testid="tracked-bill-row"
      style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 110px 160px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.1s', background: hov ? 'rgba(255,255,255,0.02)' : 'transparent' }}
    >
      <div style={{ width: 28, height: 28, background: 'var(--accent-a)', border: '1px solid var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
        {bill.name.charAt(0).toUpperCase()}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.name}</span>
          {priceUp && (
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--gold)', background: 'oklch(0.67 0.13 40 / 0.12)', border: '1px solid oklch(0.67 0.13 40 / 0.3)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>PRICE UP</span>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          {bill.recurrenceInterval} · Confirmed {fmtDate(bill.createdAt)}
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'capitalize' }}>{bill.recurrenceInterval}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, textAlign: 'right' }}>
        {priceUp && bill.lastChargedAmount !== undefined ? (
          <>
            <span style={{ color: 'var(--gold)' }}>{usd(monthlyFromInterval(bill.lastChargedAmount, bill.recurrenceInterval ?? 'monthly'))}/mo</span>
            <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1, textDecoration: 'line-through' }}>was {usd(mo)}/mo</div>
          </>
        ) : (
          <span style={{ color: 'var(--text)' }}>{usd(mo)}/mo</span>
        )}
      </div>
      <div />
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function SubscriptionsView({ pendingSubscriptions, trackedBills }: Props) {
  const [pending, setPending]   = useState(pendingSubscriptions);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const priceAlerts = trackedBills.filter(
    (b) => b.lastChargedAmount !== undefined && Math.abs(b.lastChargedAmount - b.amount) > 0.5,
  );
  const totalMonthly = trackedBills.reduce((s, b) => s + monthlyFromInterval(b.amount, b.recurrenceInterval ?? 'monthly'), 0);
  const totalAnnual  = totalMonthly * 12;

  async function handleConfirm(sub: DetectedSubscriptionResponse) {
    setConfirming(sub.id); setError(null);
    try {
      const res = await fetch('/api/v1/subscriptions/anchor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sub.id, name: sub.normalizedName, amount: sub.amount,
          interval: sub.interval, category: sub.suggestedCategory,
          rawDescriptions: sub.rawDescriptions, recurringType: sub.recurringType,
          lastCharged: sub.lastCharged,
          classificationMeta: {
            recurringType: sub.recurringType, billScore: 0, subScore: 0, signals: sub.signals,
          },
        }),
      });
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? 'Failed'); }
      setPending(prev => prev.filter(s => s.id !== sub.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm');
    } finally { setConfirming(null); }
  }

  async function handleDismiss(id: string) {
    setDismissing(id); setError(null);
    try {
      const res = await fetch('/api/v1/subscriptions/dismiss', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      });
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? 'Failed'); }
      setPending(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss');
    } finally { setDismissing(null); }
  }

  if (pending.length === 0 && trackedBills.length === 0) {
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

      {priceAlerts.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'oklch(0.67 0.13 40 / 0.08)', border: '1px solid oklch(0.67 0.13 40 / 0.25)', borderRadius: 10, padding: '10px 16px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{ fontSize: 13, color: 'var(--gold)', fontFamily: 'var(--sans)' }}>
            <strong>{priceAlerts.length} subscription{priceAlerts.length !== 1 ? 's' : ''}</strong> may have increased — review below
          </span>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: 'var(--red)', fontSize: 13, borderRadius: 8, padding: '10px 14px' }}>{error}</div>
      )}

      {pending.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 8 }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)' }}>Pending review</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{pending.length} detected</span>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: 10, overflow: 'hidden' }}>
            {pending.map(sub => (
              <PendingRow key={sub.id} sub={sub}
                isConfirming={confirming === sub.id} isDismissing={dismissing === sub.id}
                onConfirm={(s) => void handleConfirm(s)}
                onDismiss={(id) => void handleDismiss(id)}
              />
            ))}
          </div>
        </div>
      )}

      {trackedBills.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 8 }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)' }}>Your subscriptions — {trackedBills.length} tracked</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>{usd(totalMonthly)}/mo</span>
              <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{usd(totalAnnual)}/yr</span>
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {trackedBills.map(b => <TrackedRow key={b._id} bill={b} />)}
          </div>
        </div>
      )}

    </div>
  );
}
