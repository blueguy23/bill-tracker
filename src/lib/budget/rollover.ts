import type { StrictDB } from 'strictdb';
import { listBudgets, updateRollover } from '@/adapters/budgets';
import { listUnmatchedQuickAdds } from '@/adapters/quickAdd';
import { listTransactionsForMonth } from '@/adapters/transactions';
import { computeSpending, computeRollover } from './engine';

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
      const spent = computeSpending(transactions, quickAdds, budget.category, month);
      const newBalance = computeRollover(budget, spent);
      await updateRollover(db, budget.category, newBalance);
    }),
  );
}
