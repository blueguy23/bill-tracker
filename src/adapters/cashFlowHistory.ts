import type { StrictDB } from 'strictdb';
import { listTransactions, listAccounts } from '@/adapters/accounts';
import { classifyTransfer } from '@/lib/classifyTransfer';

export interface MonthlyFlow {
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export async function getCashFlowHistory(db: StrictDB, months = 6, normalized = false): Promise<MonthlyFlow[]> {
  const now = new Date();

  // Needed as fallback for transactions inserted before isTransfer was stored
  const accounts = await listAccounts(db);
  const creditAccountIds = new Set(accounts.filter(a => a.accountType === 'credit').map(a => a._id));

  // When normalized, fetch a wider window so amortized charges that started
  // before the view window can still contribute slices into it.
  const fetchStart = normalized
    ? new Date(now.getFullYear(), now.getMonth() - (months - 1) - 11, 1)
    : new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const { transactions } = await listTransactions(db, {
    startDate: fetchStart,
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
    const transfer = t.isTransfer ?? classifyTransfer(t, creditAccountIds);
    if (transfer) continue;
    const posted = t.posted instanceof Date ? t.posted : new Date(Number(t.posted) * 1000);
    const amt = Number(t.amount);

    if (normalized && t.amortize && amt < 0) {
      // Spread across 12 months starting from the charge month
      const slice = Math.abs(amt) / 12;
      for (let m = 0; m < 12; m++) {
        const d   = new Date(posted.getFullYear(), posted.getMonth() + m, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const bucket = buckets.get(key);
        if (bucket) bucket.expenses += slice;
      }
    } else {
      const key = `${posted.getFullYear()}-${posted.getMonth()}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (amt > 0) bucket.income   += amt;
      else         bucket.expenses += Math.abs(amt);
    }
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
