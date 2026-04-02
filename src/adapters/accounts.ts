import type { StrictDB } from 'strictdb';
import type { Account, Transaction } from '@/lib/simplefin/types';

const ACCOUNTS = 'accounts';
const TRANSACTIONS = 'transactions';

export async function upsertAccount(db: StrictDB, account: Account): Promise<void> {
  await db.updateOne<Account>(ACCOUNTS, { _id: account._id }, { $set: account }, true);
}

export async function upsertTransaction(db: StrictDB, txn: Transaction): Promise<boolean> {
  // Skip settled transactions that are already in the DB
  const existing = await db.queryOne<Transaction>(TRANSACTIONS, { _id: txn._id });
  if (existing && !existing.pending) return false; // already settled, skip

  await db.updateOne<Transaction>(TRANSACTIONS, { _id: txn._id }, { $set: txn });
  return true;
}

export async function listAccounts(db: StrictDB): Promise<Account[]> {
  return db.queryMany<Account>(ACCOUNTS, {}, { sort: { orgName: 1 }, limit: 200 });
}

export async function listRecentTransactions(db: StrictDB, accountId?: string): Promise<Transaction[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const filter = accountId
    ? { accountId, posted: { $gte: thirtyDaysAgo } }
    : { posted: { $gte: thirtyDaysAgo } };
  return db.queryMany<Transaction>(TRANSACTIONS, filter, { sort: { posted: -1 }, limit: 500 });
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
