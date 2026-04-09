'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CategoryBudgetSummary } from '@/types/budget';
import { BudgetCard } from './BudgetCard';
import { SetBudgetModal } from './SetBudgetModal';

interface Props {
  initialData: {
    month: string;
    budgets: CategoryBudgetSummary[];
  };
}

export function BudgetView({ initialData }: Props) {
  const router = useRouter();
  const [editCategory, setEditCategory] = useState<string | null>(null);

  const currentBudget = editCategory
    ? (initialData.budgets.find((b) => b.category === editCategory)?.monthlyAmount ?? null)
    : null;

  async function handleSaveBudget(category: string, monthlyAmount: number) {
    const res = await fetch(`/api/v1/budgets/${category}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyAmount }),
    });

    if (!res.ok) {
      let message = `Failed to save budget (${res.status})`;
      try {
        const json = await res.json() as { error?: string };
        message = json.error ?? message;
      } catch { /* empty body */ }
      throw new Error(message);
    }

    router.refresh();
  }

  const totalBudgeted = initialData.budgets.reduce((sum, b) => sum + (b.monthlyAmount ?? 0), 0);
  const totalSpent = initialData.budgets.reduce((sum, b) => sum + b.spent, 0);
  const overBudgetCount = initialData.budgets.filter((b) => b.monthlyAmount !== null && b.spent > b.monthlyAmount).length;
  const hasBudgets = totalBudgeted > 0;
  const pct = hasBudgets ? Math.min(100, Math.round((totalSpent / totalBudgeted) * 100)) : 0;
  const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <>
      {/* Summary header */}
      {hasBudgets ? (
        <div className="rounded-xl border border-teal-900/40 bg-depth-900 p-5 space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider mb-1">Total Budgeted</p>
              <p className="text-2xl font-bold text-white">{USD.format(totalBudgeted)}<span className="text-sm text-sky-700 font-normal">/mo</span></p>
            </div>
            <div>
              <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-white">{USD.format(totalSpent)}</p>
            </div>
            {overBudgetCount > 0 && (
              <div className="ml-auto">
                <p className="text-sm font-medium text-red-400">{overBudgetCount} categor{overBudgetCount === 1 ? 'y' : 'ies'} over budget</p>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-sky-700">
              <span>{pct}% used</span>
              <span>{USD.format(Math.max(0, totalBudgeted - totalSpent))} remaining</span>
            </div>
            <div className="h-2 w-full bg-depth-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-teal-900/40 bg-depth-900 p-5 text-center space-y-1">
          <p className="text-sm font-medium text-sky-300">No budgets set yet</p>
          <p className="text-xs text-sky-700">Click <span className="text-white font-medium">Set budget</span> on any category card below to get started.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialData.budgets.map((summary) => (
          <BudgetCard
            key={summary.category}
            summary={summary}
            onSetBudget={setEditCategory}
          />
        ))}
      </div>

      <SetBudgetModal
        category={editCategory}
        currentAmount={currentBudget}
        onClose={() => setEditCategory(null)}
        onSave={handleSaveBudget}
      />
    </>
  );
}
