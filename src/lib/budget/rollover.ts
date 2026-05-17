import type { StrictDB } from 'strictdb';
import { listBudgets, updateRollover } from '@/adapters/budgets';
import { listUnmatchedQuickAdds } from '@/adapters/quickAdd';
import { listTransactionsForMonth } from '@/adapters/transactions';
import { computeSpending, computeRollover } from './engine';
import type { Bill } from '@/types/bill';

/**
 * Runs at the end of a given month (YYYY-MM) to persist rollover balances.
 * Call this once after the final sync of the month completes.
 */
export async function applyMonthEndRollover(db: StrictDB, month: string): Promise<void> {
  const [budgets, quickAdds, transactions] = await Promise.all([
    listBudgets(db),
    listUnmatchedQuickAdds(db),
    listTransactionsForMonth(db, month),
  ]);

  await Promise.all(
    budgets.map(async (budget) => {
      if (budget.lastRolloverMonth === month) return;
      const spent = computeSpending(transactions, quickAdds, budget.category, month);
      const newBalance = computeRollover(budget, spent);
      await updateRollover(db, budget.category, newBalance, month);
    }),
  );

  await db.updateMany<Bill>(
    'bills',
    { isRecurring: true } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    { $set: { isPaid: false } },
  );
}
