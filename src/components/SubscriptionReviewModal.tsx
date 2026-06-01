'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => void confirm('bill')}
          disabled={isBusy}
          style={{ opacity: isBusy && busy !== 'bill' ? 0.4 : 1 }}
        >
          {busy === 'bill' ? 'Saving…' : '🧾 Track as Bill'}
        </Button>
        <Button
          size="sm"
          onClick={() => void confirm('subscription')}
          disabled={isBusy}
          style={{ opacity: isBusy && busy !== 'subscription' ? 0.4 : 1 }}
        >
          {busy === 'subscription' ? 'Saving…' : '⚡ Track as Subscription'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void dismiss()}
          disabled={isBusy}
          className="text-muted-foreground"
        >
          {busy === 'dismiss' ? '…' : 'Ignore'}
        </Button>
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
    <Dialog open={items.length > 0} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[560px] max-h-[calc(100vh-48px)] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
          <DialogTitle>Recurring charges detected</DialogTitle>
          <DialogDescription>
            {items.length} pending — classify each to start tracking
          </DialogDescription>
        </DialogHeader>

        <div style={{ padding: '0 24px', overflowY: 'auto', flex: 1 }}>
          {items.map(sub => (
            <ReviewRow key={sub.id} sub={sub} onResolved={handleResolved} />
          ))}
        </div>

        <div className="px-6 py-3.5 border-t border-border shrink-0 text-right">
          <Link
            href="/payments?tab=subscriptions"
            onClick={onClose}
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            See all in Payments →
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
