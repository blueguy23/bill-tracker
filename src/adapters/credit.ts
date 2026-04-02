import type { StrictDB } from 'strictdb';
import type { Account, Transaction } from '@/lib/simplefin/types';

const ACCOUNTS = 'accounts';
const TRANSACTIONS = 'transactions';

export async function listCreditAccounts(db: StrictDB): Promise<Account[]> {
  return db.queryMany<Account>(
    ACCOUNTS,
    { accountType: 'credit' },
    { sort: { orgName: 1 }, limit: 100 },
  );
}

export async function listCreditTransactions(
  db: StrictDB,
  accountIds: string[],
): Promise<Transaction[]> {
  if (accountIds.length === 0) return [];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return db.queryMany<Transaction>(
    TRANSACTIONS,
    { accountId: { $in: accountIds }, posted: { $gte: thirtyDaysAgo }, amount: { $lt: 0 } },
    { sort: { posted: -1 }, limit: 200 },
  );
}
