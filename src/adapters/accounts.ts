import type { StrictDB } from 'strictdb';
import type { Account, Transaction } from '@/lib/simplefin/types';
import { cached, invalidate } from '@/lib/cache';

const ACCOUNTS = 'accounts';
const TRANSACTIONS = 'transactions';

export async function upsertAccount(db: StrictDB, account: Account): Promise<void> {
  await db.updateOne<Account>(ACCOUNTS, { _id: account._id }, { $set: account }, true);
  invalidate('accounts');
}

export async function getTransaction(db: StrictDB, id: string): Promise<Transaction | null> {
  return db.queryOne<Transaction>(TRANSACTIONS, { _id: id });
}

export async function upsertTransaction(db: StrictDB, txn: Transaction): Promise<boolean> {
  const existing = await db.queryOne<Transaction>(TRANSACTIONS, { _id: txn._id });
  if (existing && !existing.pending) return false;

  await db.updateOne<Transaction>(TRANSACTIONS, { _id: txn._id }, { $set: txn }, true);
  invalidate('transactions');
  return true;
}

export async function listAccounts(db: StrictDB): Promise<Account[]> {
  return cached('accounts:list', 5 * 60 * 1000, () =>
    db.queryMany<Account>(ACCOUNTS, {}, { sort: { orgName: 1 }, limit: 200 })
  );
}

export interface ListTransactionsOpts {
  accountId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export async function listTransactions(
  db: StrictDB,
  opts: ListTransactionsOpts = {},
): Promise<{ transactions: Transaction[]; hasMore: boolean }> {
  const { accountId, startDate, endDate, limit = 100, offset = 0 } = opts;
  const filter: Record<string, unknown> = {};
  if (accountId) filter.accountId = accountId;
  if (startDate || endDate) {
    filter.posted = {
      ...(startDate ? { $gte: startDate } : {}),
      ...(endDate ? { $lte: endDate } : {}),
    };
  }
  const rows = await db.queryMany<Transaction>(TRANSACTIONS, filter, {
    sort: { posted: -1 },
    limit: limit + 1,
    skip: offset,
  });
  const hasMore = rows.length > limit;
  return { transactions: hasMore ? rows.slice(0, limit) : rows, hasMore };
}

export async function listRecentTransactions(db: StrictDB, accountId?: string): Promise<Transaction[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { transactions } = await listTransactions(db, { accountId, startDate: thirtyDaysAgo, limit: 500 });
  return transactions;
}

export interface CashFlow {
  income: number;
  expenses: number;
  net: number;
}

export async function markTransfersById(db: StrictDB, ids: string[]): Promise<void> {
  await Promise.all(ids.map(id =>
    db.updateOne<Transaction>(TRANSACTIONS, { _id: id }, { $set: { isTransfer: true } }),
  ));
}

export async function listTransactionsForDetection(
  db: StrictDB,
  days = 90,
): Promise<Transaction[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.queryMany<Transaction>(
    TRANSACTIONS,
    { posted: { $gte: cutoff }, amount: { $lt: 0 }, pending: false },
    { sort: { posted: -1 }, limit: 5000 },
  );
}

export async function listIncomeTransactions(
  db: StrictDB,
  days = 120,
): Promise<Transaction[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.queryMany<Transaction>(
    TRANSACTIONS,
    { posted: { $gte: cutoff }, amount: { $gt: 0 }, pending: false },
    { sort: { posted: -1 }, limit: 2000 },
  );
}
