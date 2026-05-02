import type { StrictDB } from 'strictdb';
import { listTransactions, listAccounts } from '@/adapters/accounts';
import { classifyTransfer } from '@/lib/classifyTransfer';

export interface MonthlyFlow {
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export async function getCashFlowHistory(db: StrictDB, months = 6): Promise<MonthlyFlow[]> {
  const now = new Date();

  // Needed as fallback for transactions inserted before isTransfer was stored
  const accounts = await listAccounts(db);
  const creditAccountIds = new Set(accounts.filter(a => a.accountType === 'credit').map(a => a._id));

  const windowStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const windowEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const { transactions } = await listTransactions(db, {
    startDate: windowStart,
    endDate:   windowEnd,
    limit:     20000,
  });

  const buckets = new Map<string, { income: number; expenses: number }>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, { income: 0, expenses: 0 });
  }

  for (const t of transactions) {
    if (t.pending) continue;
    // Use stored flag when available; fall back to live classification for legacy rows
    const transfer = t.isTransfer ?? classifyTransfer(t, creditAccountIds);
    if (transfer) continue;
    const posted = t.posted instanceof Date ? t.posted : new Date(Number(t.posted) * 1000);
    const key = `${posted.getFullYear()}-${posted.getMonth()}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const amt = Number(t.amount);
    if (amt > 0) bucket.income   += amt;
    else         bucket.expenses += Math.abs(amt);
  }

  const result: MonthlyFlow[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key   = `${d.getFullYear()}-${d.getMonth()}`;
    const b     = buckets.get(key) ?? { income: 0, expenses: 0 };
    result.push({
      label:    d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      income:   Math.round(b.income   * 100) / 100,
      expenses: Math.round(b.expenses * 100) / 100,
      net:      Math.round((b.income - b.expenses) * 100) / 100,
    });
  }

  return result;
}
