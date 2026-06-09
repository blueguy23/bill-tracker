import type { StrictDB } from 'strictdb';
import { listTransactions, listAccounts, type CashFlow } from '@/adapters/accounts';
import { computeCashFlowSimple, computeCashFlow } from '@/lib/cashFlow';
import { cached } from '@/lib/cache';

export async function getCashFlowThisMonth(db: StrictDB): Promise<CashFlow> {
  return cached('cashflow:thisMonth', 2 * 60 * 1000, async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [{ transactions }, accounts] = await Promise.all([
      listTransactions(db, { startDate: startOfMonth, endDate: endOfMonth, limit: 5000 }),
      listAccounts(db),
    ]);
    const creditAccountIds = new Set(
      accounts.filter(a => a.accountType === 'credit').map(a => a._id),
    );
    return computeCashFlowSimple(transactions, creditAccountIds);
  });
}

export async function getCashFlowForRange(
  db: StrictDB,
  startDate: Date,
  endDate: Date,
  normalized = false,
): Promise<CashFlow> {
  const fetchStart = normalized
    ? new Date(startDate.getFullYear(), startDate.getMonth() - 11, 1)
    : startDate;

  const [{ transactions }, accounts] = await Promise.all([
    listTransactions(db, { startDate: fetchStart, endDate, limit: 10000 }),
    listAccounts(db),
  ]);
  const creditAccountIds = new Set(
    accounts.filter(a => a.accountType === 'credit').map(a => a._id),
  );
  return computeCashFlow(transactions, creditAccountIds, {
    start: startDate.getTime(),
    end: endDate.getTime(),
  }, normalized);
}
