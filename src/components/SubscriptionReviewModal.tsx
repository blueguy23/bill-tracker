'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DetectedSubscriptionResponse, RecurringType } from '@/types/subscription';

interface Props {
  subscriptions: DetectedSubscriptionResponse[];
  onClose: () => void;
  onResolved: (id: string) => void;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
function usd(n: number) { return USD.format(n); }

function monthlyAmount(sub: DetectedSubscriptionResponse): number {
  if (sub.interval === 'weekly')    return sub.amount * 4;
  if (sub.interval === 'biweekly')  return sub.amount * 2;
  if (sub.interval === 'quarterly') return sub.amount / 3;
  return sub.amount;
}

const TYPE_COLORS: Record<RecurringType, { color: string; bg: string; border: string }> = {
  bill:         { color: 'var(--gold)',   bg: 'oklch(0.67 0.13 40 / 0.12)',  border: 'oklch(0.67 0.13 40 / 0.3)' },
  subscription: { color: 'var(--accent)', bg: 'var(--accent-a)',              border: 'oklch(0.6 0.2 250 / 0.3)'  },
  recurring:    { color: 'var(--text3)',  bg: 'rgba(255,255,255,0.05)',       border: 'var(--border-l)'            },
};

function ConfirmLabel({ type }: { type: RecurringType }) {
  if (type === 'bill') return <>Add as bill</>;
  return <>Yes, track it</>;
}

function ReviewRow({ sub, onResolved }: { sub: DetectedSubscriptionResponse; onResolved: (id: string) => void }) {
  const [busy, setBusy] = useState<'confirm' | 'dismiss' | null>(null);
  const tc = TYPE_COLORS[sub.recurringType];
  const mo = monthlyAmount(sub);

  async function confirm() {
    setBusy('confirm');
    try {
      await fetch('/api/v1/subscriptions/anchor', {
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
      onResolved(sub.id);
    } finally {
      setBusy(null);
    }
  }

  async function dismiss() {
    setBusy('dismiss');
    try {
      await fetch('/api/v1/subscriptions/dismiss', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sub.id }),
      });
      onResolved(sub.id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      {/* Avatar */}
      <div style={{ width: 32, height: 32, background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: tc.color, flexShrink: 0 }}>
        {sub.normalizedName.charAt(0).toUpperCase()}
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.normalizedName}</span>
          {sub.recurringType !== 'subscription' && (
            <span style={{ fontSize: 9, fontWeight: 700, color: tc.color, background: tc.bg, border: `1px solid ${tc.border}`, borderRadius: 4, padding: '1px 5px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {sub.recurringType === 'bill' ? 'Bill' : 'Recurring?'}
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 1 }}>
          {usd(mo)}/mo · {sub.interval} · {sub.occurrences}×
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => void confirm()} disabled={busy !== null}
          style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, opacity: busy ? 0.6 : 1 }}
        >
          {busy === 'confirm' ? '…' : <ConfirmLabel type={sub.recurringType} />}
        </button>
        <button
          onClick={() => void dismiss()} disabled={busy !== null}
          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-l)', background: 'transparent', color: 'var(--text3)', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 11, opacity: busy ? 0.5 : 1 }}
        >
          {busy === 'dismiss' ? '…' : 'Ignore'}
        </button>
      </div>
    </div>
  );
}

export function SubscriptionReviewModal({ subscriptions: initial, onClose, onResolved }: Props) {
  const [items, setItems] = useState(initial);

  function handleResolved(id: string) {
    onResolved(id);
    const next = items.filter((s) => s.id !== id);
    setItems(next);
    if (next.length === 0) onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, backdropFilter: 'blur(2px)' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 51, width: 'min(520px, calc(100vw - 32px))',
        background: 'var(--surface)', border: '1px solid var(--border-l)',
        borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Recurring charges detected</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
              {items.length} pending — confirm to track, or ignore to hide
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 4 }} aria-label="Close">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* List */}
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {items.map((sub) => (
            <ReviewRow key={sub.id} sub={sub} onResolved={handleResolved} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            href="/payments?tab=subscriptions"
            onClick={onClose}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'var(--sans)' }}
          >
            See all in Payments →
          </Link>
        </div>
      </div>
    </>
  );
}
