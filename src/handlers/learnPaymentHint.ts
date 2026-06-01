import type { StrictDB } from 'strictdb';
import type { Bill } from '@/types/bill';
import type { Transaction } from '@/lib/simplefin/types';
import { findBestMatch } from '@/handlers/autoPayDetect';
import { logger } from '@/lib/logger';

function normalizeForHint(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length >= 3)
    .filter(w => !STOPWORDS.has(w))
    .join(' ');
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'from', 'with', 'payment', 'online', 'bill',
  'pay', 'ach', 'web', 'auto', 'recurring', 'debit', 'purchase',
]);

export async function learnPaymentHint(db: StrictDB, bill: Bill): Promise<void> {
  if (!bill.isRecurring) return;
  if (bill.paymentDescriptionHint) return;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lookbackStart = new Date(monthStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  const txns = await db.queryMany<Transaction>(
    'transactions',
    { amount: { $lt: 0 }, pending: false, posted: { $gte: lookbackStart } } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    { limit: 3000 },
  );

  const result = findBestMatch(bill, txns);
  if (!result) return;

  const hint = normalizeForHint(result.transaction.description);
  if (hint.length < 3) return;

  await db.updateOne<Bill>(
    'bills',
    { _id: bill._id } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    { $set: { paymentDescriptionHint: hint } },
    false,
  );

  logger.info('learnPaymentHint.learned', {
    billName: bill.name,
    hint,
    matchConfidence: result.confidence,
    txnDescription: result.transaction.description,
  });
}
