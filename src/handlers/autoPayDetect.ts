import type { StrictDB } from 'strictdb';
import { listBills, updateBill } from '@/adapters/bills';
import type { Transaction } from '@/lib/simplefin/types';

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function billMatchesTransaction(billName: string, description: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const desc = normalize(description);
  const words = normalize(billName)
    .split(' ')
    .filter((w) => w.length >= 3);

  if (!words.length) return false;
  // Every significant word in the bill name must appear in the description
  return words.every((word) => desc.includes(word));
}

export async function detectAutoPayments(db: StrictDB): Promise<void> {
  const month = currentYYYYMM();

  const bills = await listBills(db);
  const candidates = bills.filter(
    (b) => b.isRecurring && b.isAutoPay && b.paidMonth !== month,
  );

  if (!candidates.length) return;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txns = await db.queryMany<Transaction>(
    'transactions',
    { amount: { $lt: 0 }, pending: false, posted: { $gte: monthStart } } as any,
    { limit: 5000 },
  );

  for (const bill of candidates) {
    const matched = txns.some((txn) => {
      if (!billMatchesTransaction(bill.name, txn.description)) return false;
      const diff = Math.abs(Math.abs(txn.amount) - bill.amount) / bill.amount;
      return diff <= 0.15;
    });

    if (matched) {
      await updateBill(db, bill._id, { isPaid: true });
      console.log(`[autoPayDetect] Auto-marked "${bill.name}" as paid for ${month}`);
    }
  }
}
