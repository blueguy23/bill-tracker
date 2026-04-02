import type { Transaction } from '@/lib/simplefin/types';
import type { Bill } from '@/types/bill';
import type { SuggestedMatch } from '@/types/subscription';
import { normalizeDescription } from './normalize';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function findAutoMatches(
  transactions: Transaction[],
  bills: Bill[],
): SuggestedMatch[] {
  const now = new Date();
  const unpaidRecurring = bills.filter((b) => b.isRecurring && !b.isPaid);

  const matchedTransactionIds = new Set<string>();
  const results: SuggestedMatch[] = [];

  for (const bill of unpaidRecurring) {
    if (typeof bill.dueDate !== 'number') continue;

    // Build expected date for this month
    const expectedDate = new Date(now.getFullYear(), now.getMonth(), bill.dueDate);
    const normalizedBillName = normalizeDescription(bill.name);

    for (const txn of transactions) {
      if (matchedTransactionIds.has(txn._id)) continue;

      const amountMatch = Math.abs(Math.abs(txn.amount) - bill.amount) <= 1.0;
      const dateMatch = Math.abs(txn.posted.getTime() - expectedDate.getTime()) <= 5 * MS_PER_DAY;

      if (!amountMatch || !dateMatch) continue;

      const normalizedDesc = normalizeDescription(txn.description);
      const descriptionMatch =
        normalizedDesc.includes(normalizedBillName) ||
        normalizedBillName.includes(normalizedDesc);

      const confidence: 'high' | 'medium' = descriptionMatch ? 'high' : 'medium';

      matchedTransactionIds.add(txn._id);
      results.push({
        transactionId: txn._id,
        billId: bill._id,
        billName: bill.name,
        confidence,
      });
      break; // one transaction per bill
    }
  }

  return results;
}
