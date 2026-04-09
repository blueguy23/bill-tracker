'use client';

import { useState } from 'react';
import type { DetectedSubscriptionResponse } from '@/types/subscription';
import type { RecurrenceInterval } from '@/types/bill';

interface Props {
  initialSubscriptions: DetectedSubscriptionResponse[];
}

const INTERVAL_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

const INTERVAL_TO_RECURRENCE: Record<string, RecurrenceInterval> = {
  weekly: 'weekly',
  biweekly: 'biweekly',
  monthly: 'monthly',
  quarterly: 'quarterly',
};

function usd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles: Record<string, string> = {
    high: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    low: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30',
  };
  const style = styles[confidence] ?? styles['low']!;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style}`}>
      {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 border border-zinc-600/30">
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

interface CardProps {
  sub: DetectedSubscriptionResponse;
  isConverting: boolean;
  isDismissing: boolean;
  onConvert: (sub: DetectedSubscriptionResponse) => void;
  onDismiss: (id: string) => void;
}

function SubscriptionCard({ sub, isConverting, isDismissing, onConvert, onDismiss }: CardProps) {
  return (
    <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{sub.normalizedName}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ConfidenceBadge confidence={sub.confidence} />
          <CategoryBadge category={sub.suggestedCategory} />
        </div>
      </div>

      {/* Amount + interval */}
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold text-white">{usd(sub.amount)}</span>
        <span className="text-sm text-zinc-400">{INTERVAL_LABELS[sub.interval] ?? sub.interval}</span>
        <span className="text-sm text-zinc-500">Charged {sub.occurrences}×</span>
        {sub.amountVariance && (
          <span className="text-xs text-amber-400">Amount varies</span>
        )}
      </div>

      {/* Next estimated */}
      <p className="text-xs text-zinc-500">
        Next est. <span className="text-zinc-400">{fmtDate(sub.nextEstimated)}</span>
        {' · '}Last charged <span className="text-zinc-400">{fmtDate(sub.lastCharged)}</span>
      </p>

      {/* Raw descriptions collapsible */}
      <details className="text-xs text-zinc-600">
        <summary className="cursor-pointer hover:text-zinc-400 transition-colors">
          Raw bank description{sub.rawDescriptions.length > 1 ? 's' : ''}
        </summary>
        <div className="mt-1 space-y-0.5 pl-2">
          {sub.rawDescriptions.map((d) => (
            <p key={d} className="text-zinc-500 font-mono">{d}</p>
          ))}
        </div>
      </details>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => onConvert(sub)}
          disabled={isConverting || isDismissing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {isConverting ? <Spinner /> : null}
          Add as Bill
        </button>
        <button
          onClick={() => onDismiss(sub.id)}
          disabled={isConverting || isDismissing}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-zinc-200 text-sm font-medium px-4 py-2 rounded-lg border border-white/[0.08] transition-colors"
        >
          {isDismissing ? <Spinner /> : null}
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function SubscriptionsView({ initialSubscriptions }: Props) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [converting, setConverting] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConvert(sub: DetectedSubscriptionResponse) {
    setConverting(sub.id);
    setError(null);
    try {
      const res = await fetch('/api/v1/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sub.normalizedName,
          amount: sub.amount,
          dueDate: new Date(sub.lastCharged).getDate(),
          category: sub.suggestedCategory,
          isRecurring: true,
          recurrenceInterval: INTERVAL_TO_RECURRENCE[sub.interval] ?? 'monthly',
          isAutoPay: true,
          isPaid: false,
        }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `Failed to create bill (${res.status})`);
      }
      setSubscriptions((prev) => prev.filter((s) => s.id !== sub.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bill');
    } finally {
      setConverting(null);
    }
  }

  async function handleDismiss(id: string) {
    setDismissing(id);
    setError(null);
    try {
      const res = await fetch('/api/v1/subscriptions/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `Failed to dismiss (${res.status})`);
      }
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss');
    } finally {
      setDismissing(null);
    }
  }

  // Monthly equivalent cost per subscription
  function monthlyAmount(sub: DetectedSubscriptionResponse): number {
    if (sub.interval === 'weekly') return sub.amount * 4;
    if (sub.interval === 'biweekly') return sub.amount * 2;
    if (sub.interval === 'quarterly') return sub.amount / 3;
    return sub.amount; // monthly
  }

  const totalMonthly = subscriptions.reduce((sum, s) => sum + monthlyAmount(s), 0);
  const totalAnnual = totalMonthly * 12;
  const byConfidence = {
    high: subscriptions.filter((s) => s.confidence === 'high').length,
    medium: subscriptions.filter((s) => s.confidence === 'medium').length,
    low: subscriptions.filter((s) => s.confidence === 'low').length,
  };

  if (subscriptions.length === 0) {
    return (
      <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-12 text-center space-y-2">
        <p className="text-zinc-400 font-medium">No recurring subscriptions detected</p>
        <p className="text-zinc-600 text-sm mt-1">
          Subscription detection scans your last 90 days of transactions for recurring charges.
          Sync more transaction history to detect patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cost summary */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-4 flex flex-wrap gap-x-8 gap-y-2 items-center">
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Monthly Total</p>
          <p className="text-xl font-bold text-white">{usd(totalMonthly)}<span className="text-sm text-zinc-500 font-normal">/mo</span></p>
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Annual Total</p>
          <p className="text-xl font-bold text-white">{usd(totalAnnual)}/yr</p>
        </div>
        <div className="ml-auto flex gap-3 text-xs">
          {byConfidence.high > 0 && <span className="text-emerald-400 font-medium">{byConfidence.high} high</span>}
          {byConfidence.medium > 0 && <span className="text-amber-400 font-medium">{byConfidence.medium} medium</span>}
          {byConfidence.low > 0 && <span className="text-zinc-400 font-medium">{byConfidence.low} low</span>}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        {subscriptions.map((sub) => (
          <SubscriptionCard
            key={sub.id}
            sub={sub}
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
