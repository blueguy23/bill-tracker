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

  return (
    <>
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
