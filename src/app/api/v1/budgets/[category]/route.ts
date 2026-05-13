import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleSetBudget } from '@/handlers/budgets';
import { notifyBudgetWarning, notifyBudgetExceeded } from '@/handlers/notifications';
import { listTransactionsForMonth } from '@/adapters/transactions';
import { listUnmatchedQuickAdds } from '@/adapters/quickAdd';
import { computeSpending, computeEffectiveBudget, computeBurnRate, computeCategoryStatus } from '@/lib/budget/engine';
import type { Budget } from '@/types/budget';
import type { BillCategory } from '@/types/bill';

async function checkBudgetNotifications(db: Awaited<ReturnType<typeof getDb>>, budget: Budget): Promise<void> {
  try {
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const [transactions, quickAdds] = await Promise.all([
      listTransactionsForMonth(db, month),
      listUnmatchedQuickAdds(db),
    ]);
    const spent = computeSpending(transactions, quickAdds, budget.category as BillCategory, month);
    const effective = computeEffectiveBudget(budget);
    const burnRate = computeBurnRate(transactions, quickAdds, budget.category as BillCategory, month, { effectiveBudget: effective });
    const status = computeCategoryStatus(effective, burnRate.linearProjectedTotal);
    const percentUsed = effective > 0 ? (spent / effective) * 100 : 0;
    const payload = { category: budget.category, spent, budget: effective, percentUsed };
    if (status === 'over_budget') void notifyBudgetExceeded(db, payload);
    else if (status === 'warning') void notifyBudgetWarning(db, payload);
  } catch (err) {
    console.error('[budget-notification]', err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;
  const db = await getDb();
  const res = await handleSetBudget(db, category, req);
  if (res.status === 200) {
    const body = await res.clone().json() as { budget?: Budget };
    if (body.budget) void checkBudgetNotifications(db, body.budget);
  }
  return res;
}
