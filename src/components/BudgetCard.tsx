'use client';

import type { CategoryBudgetSummary } from '@/types/budget';
import { CategoryBadge } from './CategoryBadge';

interface Props {
  summary: CategoryBudgetSummary;
  onSetBudget: (category: string) => void;
}

function StatusPill({ status }: { status: CategoryBudgetSummary['status'] }) {
  if (!status) return null;
  const styles = {
    on_track: 'bg-emerald-500/10 text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-400',
    over_budget: 'bg-red-500/10 text-red-400',
  };
  const labels = { on_track: 'On track', warning: 'Warning', over_budget: 'Over budget' };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ProgressBar({
  value,
  max,
  status,
}: {
  value: number;
  max: number;
  status: CategoryBudgetSummary['status'];
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colors = {
    on_track: 'bg-emerald-500',
    warning: 'bg-amber-500',
    over_budget: 'bg-red-500',
  };
  const color = status ? colors[status] : 'bg-zinc-600';
  return (
    <div className="h-1.5 rounded-full bg-depth-800 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BudgetCard({ summary, onSetBudget }: Props) {
  const { category, effectiveBudget, spent, remaining, status, burnRate, rolloverBalance } = summary;

  return (
    <div className="bg-depth-900 border border-teal-900/40 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge category={category} />
          <StatusPill status={status} />
        </div>
        <button
          onClick={() => onSetBudget(category)}
          className="text-xs text-sky-700 hover:text-sky-100 transition-colors shrink-0"
        >
          {effectiveBudget !== null ? 'Edit' : 'Set budget'}
        </button>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xl font-semibold text-white">${spent.toFixed(2)}</p>
          <p className="text-xs text-sky-700">
            {effectiveBudget !== null
              ? `of $${effectiveBudget.toFixed(2)} budget`
              : 'spent (no budget set)'}
          </p>
        </div>
        {remaining !== null && (
          <p className={`text-sm font-medium ${remaining < 0 ? 'text-red-400' : 'text-sky-500'}`}>
            {remaining < 0
              ? `-$${Math.abs(remaining).toFixed(2)} over`
              : `$${remaining.toFixed(2)} left`}
          </p>
        )}
      </div>

      {effectiveBudget !== null && (
        <ProgressBar value={spent} max={effectiveBudget} status={status} />
      )}

      {burnRate && (
        <div className="pt-1 border-t border-teal-900/25 grid grid-cols-2 gap-2 text-xs text-sky-700">
          <div>
            <span className="text-sky-500">Linear proj.</span>
            <p className="font-medium text-sky-300">${burnRate.linearProjectedTotal.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-sky-500">Rolling 7d</span>
            <p className={`font-medium ${burnRate.divergent ? 'text-amber-400' : 'text-sky-300'}`}>
              ${burnRate.rollingProjectedTotal.toFixed(2)}
              {burnRate.divergent && <span className="ml-1">⚡</span>}
            </p>
          </div>
        </div>
      )}

      {rolloverBalance !== 0 && (
        <p className="text-xs text-sky-700">
          Rollover:{' '}
          <span className={rolloverBalance > 0 ? 'text-emerald-400' : 'text-red-400'}>
            {rolloverBalance > 0 ? '+' : ''}${rolloverBalance.toFixed(2)}
          </span>
        </p>
      )}
    </div>
  );
}
