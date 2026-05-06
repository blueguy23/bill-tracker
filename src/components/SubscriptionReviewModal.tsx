'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DetectedSubscriptionResponse } from '@/types/subscription';
import type { RecurringType } from '@/types/bill';

interface Props {
  subscriptions: DetectedSubscriptionResponse[];
  onClose: () => void;
  onResolved: (id: string) => void;
}

function monthlyAmount(sub: DetectedSubscriptionResponse): number {
  if (sub.interval === 'weekly')    return sub.amount * 4;
  if (sub.interval === 'biweekly')  return sub.amount * 2;
  if (sub.interval === 'quarterly') return sub.amount / 3;
  return sub.amount;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function ReviewRow({ sub, onResolved }: { sub: DetectedSubscriptionResponse; onResolved: (id: string) => void }) {
  const [busy, setBusy] = useState<RecurringType | 'dismiss' | null>(null);
  const mo = monthlyAmount(sub);

  async function confirm(recurringType: RecurringType) {
    setBusy(recurringType);
    try {
      await fetch('/api/v1/subscriptions/anchor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sub.id, name: sub.normalizedName, amount: sub.amount,
          interval: sub.interval, category: sub.suggestedCategory,
          rawDescriptions: sub.rawDescriptions,
          recurringType,
          lastCharged: sub.lastCharged,
          classificationMeta: {
            recurringType, billScore: 0, subScore: 0, signals: sub.signals,
            userOverride: true,
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id }),
      });
      onResolved(sub.id);
    } finally {
      setBusy(null);
    }
  }

  const isBusy = busy !== null;

  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid #1c1c22' }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: 'rgba(120,100,255,0.15)',
          color: '#a090ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, flexShrink: 0,
        }}>
          {sub.normalizedName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#e0e0ea', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sub.normalizedName}
          </div>
          <div style={{ fontSize: 11, color: '#50505a', marginTop: 2 }}>
            {USD.format(mo)}/mo · {sub.interval} · {sub.occurrences}× detected
          </div>
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
          {USD.format(sub.amount)}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11 }}>
        <button
          onClick={() => void confirm('bill')}
          disabled={isBusy}
          style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#888', fontSize: 11, fontWeight: 400, fontFamily: 'Inter, sans-serif',
            padding: '7px 14px', borderRadius: 8, cursor: isBusy ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap', opacity: isBusy && busy !== 'bill' ? 0.4 : 1,
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {busy === 'bill' ? 'Saving…' : '🧾 Track as Bill'}
        </button>
        <button
          onClick={() => void confirm('subscription')}
          disabled={isBusy}
          style={{
            background: 'rgba(80,120,255,0.18)', border: '1px solid rgba(80,120,255,0.3)',
            color: '#8ab0ff', fontSize: 11, fontWeight: 500, fontFamily: 'Inter, sans-serif',
            padding: '7px 16px', borderRadius: 8, cursor: isBusy ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap', opacity: isBusy && busy !== 'subscription' ? 0.4 : 1,
            transition: 'background 0.15s',
          }}
        >
          {busy === 'subscription' ? 'Saving…' : '⚡ Track as Subscription'}
        </button>
        <button
          onClick={() => void dismiss()}
          disabled={isBusy}
          style={{
            background: 'none', border: 'none', color: '#3a3a3a',
            fontSize: 11, fontFamily: 'Inter, sans-serif',
            padding: '7px 10px', cursor: isBusy ? 'not-allowed' : 'pointer',
            opacity: isBusy ? 0.4 : 1, transition: 'color 0.15s',
          }}
        >
          {busy === 'dismiss' ? '…' : 'Ignore'}
        </button>
      </div>

      {/* Classifier hint — only shown on high-confidence suggestions */}
      {sub.typeConfidence === 'high' && (
        <div style={{ fontSize: 11, color: '#3a3a44', marginTop: 7 }}>
          Classifier suggests:{' '}
          <span style={{ color: '#8ab0ff', fontWeight: 500 }}>{sub.recurringType}</span>
          {sub.signals.length > 0 && ` (${sub.signals.slice(0, 2).join(', ')})`}
        </div>
      )}
    </div>
  );
}

export function SubscriptionReviewModal({ subscriptions: initial, onClose, onResolved }: Props) {
  const [items, setItems] = useState(initial);

  function handleResolved(id: string) {
    onResolved(id);
    const next = items.filter(s => s.id !== id);
    setItems(next);
    if (next.length === 0) onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, backdropFilter: 'blur(3px)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 51, width: 'min(560px, calc(100vw - 32px))',
        background: '#16161a', border: '1px solid #2a2a32',
        borderRadius: 18, boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100vh - 48px)',
      }}>
        {/* Header */}
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid #1e1e26', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e8e8f0', letterSpacing: '-0.01em' }}>
                Recurring charges detected
              </div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 3, fontWeight: 400 }}>
                {items.length} pending — classify each to start tracking
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#444', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 2, transition: 'color 0.15s' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable item list */}
        <div style={{ padding: '0 24px', overflowY: 'auto', flex: 1 }}>
          {items.map(sub => (
            <ReviewRow key={sub.id} sub={sub} onResolved={handleResolved} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #1c1c22', textAlign: 'right', flexShrink: 0 }}>
          <Link
            href="/payments?tab=subscriptions"
            onClick={onClose}
            style={{ fontSize: 12, color: '#8ab0ff', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
          >
            See all in Payments →
          </Link>
        </div>
      </div>
    </>
  );
}
