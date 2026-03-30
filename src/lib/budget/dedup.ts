import type { SpendingTransaction } from './engine';
import type { QuickAddTransaction, DedupeMatch } from '@/types/budget';

const AMOUNT_TOLERANCE = 0.5;
const DATE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

export function matchQuickAdds(
  quickAdds: QuickAddTransaction[],
  transactions: SpendingTransaction[],
): DedupeMatch[] {
  const matches: DedupeMatch[] = [];

  for (const qa of quickAdds) {
    // Skip already-matched quick-adds
    if (qa.matchedTransactionId !== null) continue;

    for (const txn of transactions) {
      // Must be an expense (negative amount)
      if (txn.amount >= 0) continue;

      // Category must match
      if (txn.category !== qa.category) continue;

      // Amount must be within tolerance (qa.amount is positive expense, txn.amount is negative)
      if (Math.abs(Math.abs(txn.amount) - qa.amount) > AMOUNT_TOLERANCE) continue;

      // Dates must be within 3-day window
      const timeDiff = Math.abs(txn.posted.getTime() - qa.addedAt.getTime());
      if (timeDiff > DATE_WINDOW_MS) continue;

      matches.push({ quickAddId: qa._id, transactionId: txn._id });
      break; // each quick-add matches at most one transaction
    }
  }

  return matches;
}
