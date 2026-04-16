'use client';

import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'bill-tracker-onboarding-dismissed';

interface OnboardingBannerProps {
  simplefinConfigured: boolean;
  accountCount: number;
  billCount?: number;
  hasBudget?: boolean;
}

interface Step {
  label: string;
  detail: string;
  done: boolean;
}

export function OnboardingBanner({
  simplefinConfigured,
  accountCount,
  billCount = 0,
  hasBudget = false,
}: OnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid hydration flash

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');
  }, []);

  const isComplete = simplefinConfigured && accountCount > 0 && billCount > 0 && hasBudget;

  if (dismissed || isComplete) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  }

  const steps: Step[] = [
    {
      label: 'Connect SimpleFIN',
      detail: 'Add SIMPLEFIN_ACCESS_URL to your .env file',
      done: simplefinConfigured,
    },
    {
      label: 'Sync your accounts',
      detail: 'Click Sync Now in the sidebar to import transactions',
      done: accountCount > 0,
    },
    {
      label: 'Add your first bill',
      detail: 'Track a recurring payment on the Dashboard',
      done: billCount > 0,
    },
    {
      label: 'Set a budget',
      detail: 'Visit the Budget page to set spending limits by category',
      done: hasBudget,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <div
      className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-5 space-y-4"
      data-testid="onboarding-banner"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-amber-300">
            {completedCount === 0
              ? 'Get started with Bill Tracker'
              : `${completedCount} of ${steps.length} setup steps complete`}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {simplefinConfigured
              ? 'Complete setup to unlock all features.'
              : 'Bill Tracker uses SimpleFIN to securely read your transaction data. No credentials stored.'}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          aria-label="Dismiss"
          data-testid="onboarding-dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden" data-testid="onboarding-progress-bar">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps */}
      <ol className="space-y-2" data-testid="onboarding-steps">
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-start gap-3">
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                step.done
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
              data-testid={`onboarding-step-${i + 1}`}
            >
              {step.done ? '✓' : i + 1}
            </span>
            <div>
              <p className={`text-sm font-medium ${step.done ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                {step.label}
              </p>
              {!step.done && (
                <p className="text-xs text-zinc-500">{step.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
