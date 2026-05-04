import type { StrictDB } from 'strictdb';
import type { Transaction } from '@/lib/simplefin/types';

const TRANSACTIONS = 'transactions';
const WINDOW_DAYS = 10;
const MAX_DATE_DIFF_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Finds transactions that are likely internal transfers between the user's own
 * accounts by matching equal-and-opposite amounts across different account IDs
 * within a 2-day window. Returns the _ids of transactions that should be tagged.
 *
 * Handles two cases:
 * 1. Both sides untagged (e.g. savings → checking transfer)
 * 2. Credit side already tagged as isTransfer:true (e.g. credit card payment — the
 *    +$1500 on the CC is already tagged, but the -$1500 on checking is not)
 */
export async function detectPairedTransfers(db: StrictDB, lookbackDays = WINDOW_DAYS): Promise<string[]> {
  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  // Only untagged debits need tagging
  const untaggedDebits = await db.queryMany<Transaction>(
    TRANSACTIONS,
    { posted: { $gte: cutoff }, pending: false, amount: { $lt: 0 }, isTransfer: { $ne: true } },
    { sort: { posted: -1 }, limit: 5000 },
  );

  if (!untaggedDebits.length) return [];

  // All credits in window — include already-tagged ones so we can find the
  // checking debit that matches a credit-card payment credit already tagged
  const allCredits = await db.queryMany<Transaction>(
    TRANSACTIONS,
    { posted: { $gte: cutoff }, pending: false, amount: { $gt: 0 } },
    { sort: { posted: -1 }, limit: 5000 },
  );

  // Group credits by rounded absolute amount
  const creditsByAmount = new Map<string, Transaction[]>();
  for (const credit of allCredits) {
    const key = Number(credit.amount).toFixed(2);
    const group = creditsByAmount.get(key);
    if (group) group.push(credit);
    else creditsByAmount.set(key, [credit]);
  }

  const toTag = new Set<string>();

  // Group debits by abs amount to batch the lookup
  const debitsByAmount = new Map<string, Transaction[]>();
  for (const debit of untaggedDebits) {
    const key = Math.abs(Number(debit.amount)).toFixed(2);
    const group = debitsByAmount.get(key);
    if (group) group.push(debit);
    else debitsByAmount.set(key, [debit]);
  }

  for (const [amountKey, debits] of debitsByAmount) {
    const credits = creditsByAmount.get(amountKey) ?? [];
    if (!credits.length) continue;

    // Prefer untagged credits first so we don't falsely pair an already-tagged
    // transfer against an unrelated debit when a real pair exists
    const untaggedCredits = credits.filter(c => !c.isTransfer);
    const taggedCredits   = credits.filter(c => c.isTransfer);

    const usedCreditIds = new Set<string>();

    for (const debit of debits) {
      const debitTime = new Date(debit.posted).getTime();

      // Try untagged credits first (plain bank transfer — tag both sides)
      let best: { txn: Transaction; diff: number; alreadyTagged: boolean } | null = null;

      for (const credit of untaggedCredits) {
        if (usedCreditIds.has(credit._id)) continue;
        if (credit.accountId === debit.accountId) continue;
        const diff = Math.abs(new Date(credit.posted).getTime() - debitTime);
        if (diff <= MAX_DATE_DIFF_MS && (!best || diff < best.diff)) {
          best = { txn: credit, diff, alreadyTagged: false };
        }
      }

      // Fall back to already-tagged credits (e.g. credit card payment — tag the debit only)
      if (!best) {
        for (const credit of taggedCredits) {
          if (usedCreditIds.has(credit._id)) continue;
          if (credit.accountId === debit.accountId) continue;
          const diff = Math.abs(new Date(credit.posted).getTime() - debitTime);
          if (diff <= MAX_DATE_DIFF_MS && (!best || diff < best.diff)) {
            best = { txn: credit, diff, alreadyTagged: true };
          }
        }
      }

      if (best) {
        usedCreditIds.add(best.txn._id);
        toTag.add(debit._id);
        if (!best.alreadyTagged) toTag.add(best.txn._id);
      }
    }
  }

  return [...toTag];
}
