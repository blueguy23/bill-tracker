import type { StrictDB } from 'strictdb';
import { listBills, updateBill } from '@/adapters/bills';
import { createPayment } from '@/adapters/payments';
import { notifyPriceIncrease, notifyPriceDecrease } from '@/handlers/notifications';
import type { Transaction } from '@/lib/simplefin/types';
import type { Bill } from '@/types/bill';
import { logger } from '@/lib/logger';

const PRICE_INCREASE_PCT   = 0.05;  // >5% triggers alert
const PRICE_INCREASE_MIN   = 0.50;  // must be >$0.50 absolute to avoid noise
export const AMOUNT_MATCH_WINDOW  = 0.30;  // ±30% window to find candidate transactions

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export type MatchConfidence = 'hint' | 'name' | 'fuzzy';

function billMatchesTransaction(
  billName: string,
  description: string,
  hint: string | undefined,
): { matched: boolean; confidence: MatchConfidence } {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const desc = normalize(description);

  if (hint) {
    const normalizedHint = normalize(hint);
    const hintWords = normalizedHint.split(' ').filter((w) => w.length >= 3);
    if (hintWords.length && hintWords.every((word) => desc.includes(word))) {
      return { matched: true, confidence: 'hint' };
    }
    // Hint didn't match — fall through to name-based matching
  }

  const words = normalize(billName).split(' ').filter((w) => w.length >= 4);
  if (!words.length) return { matched: false, confidence: 'name' };

  const longest = words.sort((a, b) => b.length - a.length)[0]!;
  if (desc.includes(longest)) {
    return { matched: true, confidence: 'name' };
  }

  return { matched: false, confidence: 'fuzzy' };
}

export interface MatchResult {
  transaction: Transaction;
  confidence: MatchConfidence;
}

export function findBestMatch(bill: Bill, txns: Transaction[]): MatchResult | null {
  const hint = bill.paymentDescriptionHint;
  const candidates: { txn: Transaction; confidence: MatchConfidence }[] = [];

  for (const txn of txns) {
    if (Math.abs(Math.abs(txn.amount) - bill.amount) / bill.amount > AMOUNT_MATCH_WINDOW) continue;
    const { matched, confidence } = billMatchesTransaction(bill.name, txn.description, hint);
    if (matched) candidates.push({ txn, confidence });
  }

  if (!candidates.length) return null;
  candidates.sort(
    (a, b) =>
      Math.abs(Math.abs(a.txn.amount) - bill.amount) -
      Math.abs(Math.abs(b.txn.amount) - bill.amount),
  );
  const best = candidates[0]!;
  return { transaction: best.txn, confidence: best.confidence };
}

export async function detectAutoPayments(db: StrictDB): Promise<void> {
  const month = currentYYYYMM();
  const bills = await listBills(db);

  // All recurring bills not yet paid this month
  const candidates = bills.filter((b) => b.isRecurring && b.paidMonth !== month);
  if (!candidates.length) return;

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const LOOKBACK_DAYS = 5;
  const lookbackStart = new Date(monthStart.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // StrictDB's queryMany filter type doesn't expose MongoDB operator shapes ($lt, $gte)
  const txns = await db.queryMany<Transaction>(
    'transactions',
    { amount: { $lt: 0 }, pending: false, posted: { $gte: lookbackStart } } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    { limit: 5000 },
  );

  const txnsThisMonth = txns.filter((t) => t.posted >= monthStart);

  for (const bill of candidates) {
    const dueDay = typeof bill.dueDate === 'number' ? bill.dueDate : null;
    const eligibleTxns = (dueDay !== null && dueDay <= 7) ? txns : txnsThisMonth;
    const result = findBestMatch(bill, eligibleTxns);
    if (!result) continue;

    const { transaction: match, confidence } = result;
    const chargedAmt  = Math.abs(match.amount);
    const expectedAmt = bill.lastChargedAmount ?? bill.amount;
    const absDiff     = chargedAmt - expectedAmt;
    const pctDiff     = absDiff / expectedAmt;

    // Price increase — charge is meaningfully higher than expected
    if (pctDiff > PRICE_INCREASE_PCT && absDiff > PRICE_INCREASE_MIN) {
      logger.info('autoPayDetect.priceIncrease', {
        billName: bill.name,
        expectedAmt,
        chargedAmt,
        pctDiff: `+${(pctDiff * 100).toFixed(1)}%`,
      });
      void notifyPriceIncrease(db, {
        billId: bill._id,
        billName: bill.name,
        previousAmount: expectedAmt,
        newAmount: chargedAmt,
        increase: absDiff,
        percentIncrease: pctDiff,
      });
    }

    // Price decrease — charge is meaningfully lower than expected
    if (pctDiff < -PRICE_INCREASE_PCT && Math.abs(absDiff) > PRICE_INCREASE_MIN) {
      logger.info('autoPayDetect.priceDecrease', {
        billName: bill.name,
        expectedAmt,
        chargedAmt,
        pctDiff: `${(pctDiff * 100).toFixed(1)}%`,
      });
      void notifyPriceDecrease(db, {
        billId: bill._id,
        billName: bill.name,
        previousAmount: expectedAmt,
        newAmount: chargedAmt,
        decrease: Math.abs(absDiff),
        percentDecrease: Math.abs(pctDiff),
      });
    }

    // Mark paid and record the actual charged amount for drift tracking
    await updateBill(db, bill._id, { isPaid: true });
    if (!bill.isPaid) {
      await createPayment(db, { billId: bill._id, billName: bill.name, amount: bill.amount });
    }
    // StrictDB's updateOne filter type doesn't expose MongoDB's _id query shape
    await db.updateOne<Bill>(
      'bills',
      { _id: bill._id } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      { $set: { lastChargedAmount: chargedAmt } },
      false,
    );
    logger.info('autoPayDetect.markedPaid', { billName: bill.name, month, chargedAmt, matchConfidence: confidence });
  }
}
