'use client';

import { useState } from 'react';
import type { DetectedSubscriptionResponse, RecurringType } from '@/types/subscription';
import type { BillResponse } from '@/types/bill';
import type { ChargeRecordResponse } from '@/adapters/chargeHistory';

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
  const [hov, setHov]         = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory]  = useState<ChargeRecordResponse[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const mo      = monthlyFromInterval(bill.amount, bill.recurrenceInterval ?? 'monthly');
  const priceUp = bill.lastChargedAmount !== undefined && Math.abs(bill.lastChargedAmount - bill.amount) > 0.5;

  async function toggleHistory() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (history !== null) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/v1/bills/${bill._id}/charges`);
      if (res.ok) {
        const data = await res.json() as { charges: ChargeRecordResponse[] };
        setHistory(data.charges);
      }
    } finally {
      setLoadingHistory(false);
    }
  }

  return (
    <div
      data-testid="tracked-bill-row"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 110px 160px', padding: '12px 16px', alignItems: 'center', transition: 'background 0.1s', background: hov ? 'rgba(255,255,255,0.02)' : 'transparent', cursor: 'pointer' }}
        onClick={() => void toggleHistory()}
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
            {bill.classificationMeta?.recurringType === 'bill' && (
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--gold)', background: 'oklch(0.67 0.13 40 / 0.08)', border: '1px solid oklch(0.67 0.13 40 / 0.25)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>BILL</span>
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
        <div style={{ textAlign: 'right' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Expandable price history */}
      {expanded && (
        <div style={{ padding: '0 16px 12px 60px' }}>
          {loadingHistory && (
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Loading history…</div>
          )}
          {!loadingHistory && history !== null && history.length === 0 && (
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>No charge history recorded yet</div>
          )}
          {!loadingHistory && history !== null && history.length > 0 && (
            <div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 6 }}>Price history (newest first)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {history.map((c, i) => {
                  const prev = history[i + 1];
                  const delta = prev ? c.amount - prev.amount : 0;
                  const up   = delta > 0.5;
                  const down = delta < -0.5;
                  return (
                    <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontFamily: 'var(--mono)' }}>
                      <span style={{ color: 'var(--text3)', minWidth: 60 }}>
                        {new Date(c.detectedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                      </span>
                      <span style={{ fontWeight: 600, color: up ? 'var(--gold)' : down ? 'var(--green)' : 'var(--text)' }}>
                        {usd(c.amount)}
                      </span>
                      {up   && <span style={{ fontSize: 9, color: 'var(--gold)' }}>↑ +{usd(Math.abs(delta))}</span>}
                      {down && <span style={{ fontSize: 9, color: 'var(--green)' }}>↓ −{usd(Math.abs(delta))}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function SubscriptionsView({ pendingSubscriptions, trackedBills }: Props) {
  const [pending, setPending]         = useState(pendingSubscriptions);
  const [confirming, setConfirming]   = useState<string | null>(null);
  const [dismissing, setDismissing]   = useState<string | null>(null);
  const [amortizing, setAmortizing]   = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const yearlyPending   = pending.filter(s => s.interval === 'yearly');
  const regularPending  = pending.filter(s => s.interval !== 'yearly');

  async function handleAmortizeConfirm(sub: DetectedSubscriptionResponse) {
    setAmortizing(sub.id); setError(null);
    try {
      const res = await fetch(`/api/v1/transactions/${sub.lastTransactionId}/amortize`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amortize: true }),
      });
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? 'Failed'); }
      setPending(prev => prev.filter(s => s.id !== sub.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to amortize');
    } finally { setAmortizing(null); }
  }

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

      {yearlyPending.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 8 }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)' }}>Annual payments — spread over 12 months?</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{yearlyPending.length} detected</span>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '2px solid rgba(99,179,237,0.5)', borderRadius: 10, overflow: 'hidden' }}>
            {yearlyPending.map(sub => {
              const busy = amortizing === sub.id || dismissing === sub.id;
              return (
                <div key={sub.id} data-testid="yearly-amortize-row" style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px 110px 160px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                  <div style={{ width: 28, height: 28, background: 'rgba(99,179,237,0.08)', border: '1px solid rgba(99,179,237,0.25)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#63b3ed', flexShrink: 0 }}>
                    {sub.normalizedName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{sub.normalizedName}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                      {sub.occurrences}× yearly · {usd(sub.amount / 12)}/mo if spread
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: '#63b3ed', fontFamily: 'var(--mono)' }}>Yearly</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, color: 'var(--text)', textAlign: 'right' }}>
                    {usd(sub.amount)}
                    <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>/ charge</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => void handleAmortizeConfirm(sub)} disabled={busy}
                      style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(99,179,237,0.15)', color: '#63b3ed', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, opacity: busy ? 0.6 : 1 }}
                    >
                      {amortizing === sub.id ? '…' : 'Spread it'}
                    </button>
                    <button
                      onClick={() => void handleDismiss(sub.id)} disabled={busy}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-l)', background: 'transparent', color: 'var(--text3)', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 11, opacity: busy ? 0.5 : 1 }}
                    >
                      {dismissing === sub.id ? '…' : 'No thanks'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {regularPending.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 8 }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)' }}>Pending review</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{regularPending.length} detected</span>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: 10, overflow: 'hidden' }}>
            {regularPending.map(sub => (
              <PendingRow key={sub.id} sub={sub}
                isConfirming={confirming === sub.id} isDismissing={dismissing === sub.id}
                onConfirm={(s) => void handleConfirm(s)}
                onDismiss={(id) => void handleDismiss(id)}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
