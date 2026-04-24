import type { StrictDB } from 'strictdb';
import { listBills, updateBill } from '@/adapters/bills';
import { notifyPriceIncrease } from '@/handlers/notifications';
import type { Transaction } from '@/lib/simplefin/types';
import type { Bill } from '@/types/bill';
import { logger } from '@/lib/logger';

const PRICE_INCREASE_PCT   = 0.05;  // >5% triggers alert
const PRICE_INCREASE_MIN   = 0.50;  // must be >$0.50 absolute to avoid noise
const AMOUNT_MATCH_WINDOW  = 0.30;  // ±30% window to find candidate transactions

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function billMatchesTransaction(billName: string, description: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const desc  = normalize(description);
  const words = normalize(billName).split(' ').filter((w) => w.length >= 3);
  if (!words.length) return false;
  return words.every((word) => desc.includes(word));
}

function findBestMatch(bill: Bill, txns: Transaction[]): Transaction | null {
  const matchName = bill.paymentDescriptionHint ?? bill.name;
  const candidates = txns.filter(
    (txn) =>
      billMatchesTransaction(matchName, txn.description) &&
      Math.abs(Math.abs(txn.amount) - bill.amount) / bill.amount <= AMOUNT_MATCH_WINDOW,
  );
  if (!candidates.length) return null;
  // Closest amount wins
  return candidates.sort(
    (a, b) =>
      Math.abs(Math.abs(a.amount) - bill.amount) -
      Math.abs(Math.abs(b.amount) - bill.amount),
  )[0] ?? null;
}

export async function detectAutoPayments(db: StrictDB): Promise<void> {
  const month = currentYYYYMM();
  const bills = await listBills(db);

  // All recurring bills not yet paid this month
  const candidates = bills.filter((b) => b.isRecurring && b.paidMonth !== month);
  if (!candidates.length) return;

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // StrictDB's queryMany filter type doesn't expose MongoDB operator shapes ($lt, $gte)
  const txns = await db.queryMany<Transaction>(
    'transactions',
    { amount: { $lt: 0 }, pending: false, posted: { $gte: monthStart } } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    { limit: 5000 },
  );

  for (const bill of candidates) {
    const match = findBestMatch(bill, txns);
    if (!match) continue;

    const chargedAmt  = Math.abs(match.amount);
    const expectedAmt = bill.amount;
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

    // Mark paid and record the actual charged amount for drift tracking
    await updateBill(db, bill._id, { isPaid: true });
    // StrictDB's updateOne filter type doesn't expose MongoDB's _id query shape
    await db.updateOne<Bill>(
      'bills',
      { _id: bill._id } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      { $set: { lastChargedAmount: chargedAmt } },
      false,
    );
    logger.info('autoPayDetect.markedPaid', { billName: bill.name, month, chargedAmt });
  }
}
