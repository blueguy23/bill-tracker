import type { StrictDB } from 'strictdb';
import { listTransactions, listAccounts } from '@/adapters/accounts';
import { bucketByMonth } from '@/lib/cashFlow';

export interface MonthlyFlow {
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export async function getCashFlowHistory(db: StrictDB, months = 6, normalized = false): Promise<MonthlyFlow[]> {
  const now = new Date();

  const fetchStart = normalized
    ? new Date(now.getFullYear(), now.getMonth() - (months - 1) - 11, 1)
    : new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [{ transactions }, accounts] = await Promise.all([
    listTransactions(db, { startDate: fetchStart, endDate: windowEnd, limit: 20000 }),
    listAccounts(db),
  ]);
  const creditAccountIds = new Set(accounts.filter(a => a.accountType === 'credit').map(a => a._id));

  const buckets = new Map<string, { income: number; expenses: number }>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, { income: 0, expenses: 0 });
  }

  bucketByMonth(transactions, creditAccountIds, buckets, normalized);

  const result: MonthlyFlow[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b   = buckets.get(key) ?? { income: 0, expenses: 0 };
    result.push({
      label:    d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      income:   Math.round(b.income   * 100) / 100,
      expenses: Math.round(b.expenses * 100) / 100,
      net:      Math.round((b.income - b.expenses) * 100) / 100,
    });
  }

  return result;
}
