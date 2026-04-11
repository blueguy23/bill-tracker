import type { Metadata } from 'next';
import type { CategoryBudgetSummary } from '@/types/budget';
import { BudgetView } from '@/components/BudgetView';
import { getDb } from '@/adapters/db';
import { listBudgets } from '@/adapters/budgets';
import { listUnmatchedQuickAdds } from '@/adapters/quickAdd';
import { listTransactionsForMonth } from '@/adapters/transactions';
import { computeSpending, computeEffectiveBudget, computeBurnRate, computeCategoryStatus } from '@/lib/budget/engine';
import { BILL_CATEGORIES } from '@/types/bill';

export const metadata: Metadata = { title: 'Budget' };

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function BudgetPage() {
  const db = await getDb();
  const month = currentMonth();
  const today = new Date();

  const [budgetDocs, quickAdds, transactions] = await Promise.all([
    listBudgets(db),
    listUnmatchedQuickAdds(db),
    listTransactionsForMonth(db, month),
  ]);

  const budgetMap = new Map(budgetDocs.map((b) => [b.category, b]));

  const budgets: CategoryBudgetSummary[] = BILL_CATEGORIES.map((category) => {
    const budget = budgetMap.get(category) ?? null;
    const spent = computeSpending(transactions, quickAdds, category, month);

    if (!budget) {
      return { category, monthlyAmount: null, rolloverBalance: 0, effectiveBudget: null, spent, remaining: null, status: null, burnRate: null };
    }

    const effectiveBudget = computeEffectiveBudget(budget);
    const remaining = effectiveBudget - spent;
    const burnRate = computeBurnRate(transactions, quickAdds, category, month, { today, effectiveBudget });
    const status = computeCategoryStatus(effectiveBudget, burnRate.linearProjectedTotal);

    return { category, monthlyAmount: budget.monthlyAmount, rolloverBalance: budget.rolloverBalance, effectiveBudget, spent, remaining, status, burnRate };
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Budget</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {month ? `${month} — spending by category` : 'Monthly spending by category'}
          </p>
        </div>
      </div>
      <BudgetView initialData={{ month, budgets }} />
    </div>
  );
}
