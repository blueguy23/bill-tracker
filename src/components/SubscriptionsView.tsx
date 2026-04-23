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

const CONF_COLORS: Record<string, string> = {
  high: 'var(--green)', medium: 'var(--gold)', low: 'var(--text3)',
};

function usd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function monthlyAmount(sub: DetectedSubscriptionResponse): number {
  if (sub.interval === 'weekly') return sub.amount * 4;
  if (sub.interval === 'biweekly') return sub.amount * 2;
  if (sub.interval === 'quarterly') return sub.amount / 3;
  return sub.amount;
}

interface CardProps {
  sub: DetectedSubscriptionResponse;
  isConverting: boolean;
  isDismissing: boolean;
  onConvert: (sub: DetectedSubscriptionResponse) => void;
  onDismiss: (id: string) => void;
}

function SubscriptionCard({ sub, isConverting, isDismissing, onConvert, onDismiss }: CardProps) {
  const [hov, setHov] = useState(false);
  const confColor = CONF_COLORS[sub.confidence] ?? 'var(--text3)';
  const initial   = sub.normalizedName.charAt(0).toUpperCase();
  const mo        = monthlyAmount(sub);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hov ? 'var(--border-l)' : 'var(--border)'}`,
        borderRadius: 10, padding: '16px 18px',
        transition: 'border-color .15s',
      }}
    >
      {/* Header row: avatar | name/category | amount/mo | confidence badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Letter avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: 8,
          background: 'var(--raised)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 16, fontWeight: 700,
          color: 'var(--text2)', fontFamily: 'var(--sans)', flexShrink: 0,
        }}>
          {initial}
        </div>

        {/* Name + category */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sub.normalizedName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
            {sub.suggestedCategory.toUpperCase()}
          </div>
        </div>

        {/* Amount/mo */}
        <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>
          {usd(mo)}/mo
        </div>

        {/* Confidence badge */}
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--mono)', background: `${confColor}18`, color: confColor, flexShrink: 0 }}>
          {sub.confidence.toUpperCase()}
        </span>
      </div>

      {/* Meta row */}
      <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--raised)', borderRadius: 6, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>↳</span>
        <span>Next est. <span style={{ color: 'var(--text2)' }}>{fmtDate(sub.nextEstimated)}</span></span>
        <span style={{ color: 'var(--border-l)' }}>·</span>
        <span>Last <span style={{ color: 'var(--text2)' }}>{fmtDate(sub.lastCharged)}</span></span>
        <span style={{ color: 'var(--border-l)' }}>·</span>
        <span>{sub.occurrences}× charged</span>
        {sub.amountVariance && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: 'rgba(234,179,8,.12)', color: 'var(--gold)', marginLeft: 4 }}>VARIES</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <button
          onClick={() => onConvert(sub)}
          disabled={isConverting || isDismissing}
          style={{
            padding: '7px 16px', borderRadius: 8, border: 'none',
            background: isConverting ? 'var(--accent-a)' : 'var(--accent)',
            color: '#fff', cursor: isConverting || isDismissing ? 'not-allowed' : 'pointer',
            fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 600,
            opacity: isConverting || isDismissing ? 0.6 : 1,
          }}
        >
          {isConverting ? '…' : '+ Add as Bill'}
        </button>
        <button
          onClick={() => onDismiss(sub.id)}
          disabled={isConverting || isDismissing}
          style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text3)',
            cursor: isConverting || isDismissing ? 'not-allowed' : 'pointer',
            fontSize: 13, fontFamily: 'var(--sans)',
            opacity: isConverting || isDismissing ? 0.5 : 1,
          }}
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sub.normalizedName, amount: sub.amount,
          dueDate: new Date(sub.lastCharged).getDate(),
          category: sub.suggestedCategory, isRecurring: true,
          recurrenceInterval: INTERVAL_TO_RECURRENCE[sub.interval] ?? 'monthly',
          isAutoPay: true, isPaid: false,
        }),
      });
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? 'Failed'); }
      setSubscriptions((prev) => prev.filter((s) => s.id !== sub.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bill');
    } finally { setConverting(null); }
  }

  async function handleDismiss(id: string) {
    setDismissing(id); setError(null);
    try {
      const res = await fetch('/api/v1/subscriptions/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? 'Failed'); }
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss');
    } finally { setDismissing(null); }
  }

  const totalMonthly = subscriptions.reduce((s, sub) => s + monthlyAmount(sub), 0);
  const totalAnnual  = totalMonthly * 12;
  const byConf = { high: 0, medium: 0, low: 0 };
  subscriptions.forEach((s) => { if (s.confidence in byConf) byConf[s.confidence as keyof typeof byConf]++; });

  if (subscriptions.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--sans)', marginBottom: 6 }}>No subscriptions detected</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
          Sync more transaction history to detect recurring patterns.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'MONTHLY TOTAL', value: `${usd(totalMonthly)}/mo`, color: 'var(--text)' },
          { label: 'ANNUAL TOTAL',  value: `${usd(totalAnnual)}/yr`,  color: 'var(--text)' },
          { label: 'CONFIDENCE',    value: `${byConf.high} high · ${byConf.medium} med · ${byConf.low} low`, color: 'var(--text2)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 400, color, letterSpacing: '.01em' }}>{value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: 'var(--red)', fontSize: 13, borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--sans)' }}>
          {error}
        </div>
      )}

      {/* YOUR SUBSCRIPTIONS label */}
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>YOUR SUBSCRIPTIONS</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {subscriptions.map((sub) => (
          <SubscriptionCard
            key={sub.id} sub={sub}
            isConverting={converting === sub.id}
            isDismissing={dismissing === sub.id}
            onConvert={handleConvert}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  );
}
