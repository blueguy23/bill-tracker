import type { StrictDB } from 'strictdb';
import type { Account, Transaction } from '@/lib/simplefin/types';
import { categorize } from '@/lib/categorization/engine';
import { listCategoryRules } from '@/adapters/categoryRules';

// Descriptions that indicate inter-account transfers (not real income/expense)
const TRANSFER_DESCRIPTION_RE = /^(deposit from |transfer from |transfer to |online transfer|account transfer)/i;

function buildTransferRe(): RegExp {
  const ownerName = process.env.TRANSFER_OWNER_NAME?.trim();
  if (!ownerName) return TRANSFER_DESCRIPTION_RE;
  const escaped = ownerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `^(deposit from |transfer from |transfer to |online transfer|account transfer)` +
    `|zelle.*${escaped}|${escaped}.*zelle`,
    'i'
  );
}

let _transferRe: RegExp | null = null;
function getTransferRe(): RegExp {
  return (_transferRe ??= buildTransferRe());
}

function isTransfer(txn: Transaction, creditAccountIds: Set<string>): boolean {
  if (creditAccountIds.has(txn.accountId) && txn.amount > 0) return true;
  return getTransferRe().test(txn.description);
}

const ACCOUNTS = 'accounts';
const TRANSACTIONS = 'transactions';

export async function upsertAccount(db: StrictDB, account: Account): Promise<void> {
  await db.updateOne<Account>(ACCOUNTS, { _id: account._id }, { $set: account }, true);
}

export async function upsertTransaction(db: StrictDB, txn: Transaction): Promise<boolean> {
  // Skip settled transactions that are already in the DB
  const existing = await db.queryOne<Transaction>(TRANSACTIONS, { _id: txn._id });
  if (existing && !existing.pending) return false; // already settled, skip

  // Auto-categorize only if the user hasn't manually set a category
  const preserveCategory = existing?.categorySource === 'user';
  const toSave: Transaction = preserveCategory
    ? { ...txn, category: existing.category, categorySource: 'user' }
    : { ...txn, category: categorize(txn.description, txn.memo, await listCategoryRules(db)), categorySource: 'auto' };

  await db.updateOne<Transaction>(TRANSACTIONS, { _id: txn._id }, { $set: toSave }, true);
  return true;
}

export async function listAccounts(db: StrictDB): Promise<Account[]> {
  return db.queryMany<Account>(ACCOUNTS, {}, { sort: { orgName: 1 }, limit: 200 });
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

export async function getCashFlowThisMonth(db: StrictDB): Promise<CashFlow> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [{ transactions }, accounts] = await Promise.all([
    listTransactions(db, { startDate: startOfMonth, endDate: endOfMonth, limit: 5000 }),
    listAccounts(db),
  ]);
  const creditAccountIds = new Set(accounts.filter(a => a.accountType === 'credit').map(a => a._id));

  let income = 0;
  let expenses = 0;
  for (const txn of transactions) {
    if (txn.pending) continue;
    if (isTransfer(txn, creditAccountIds)) continue;
    const amt = Number(txn.amount);
    if (amt > 0) income   += amt;
    else         expenses += Math.abs(amt);
  }

  return { income, expenses, net: income - expenses };
}

export async function getCashFlowForRange(db: StrictDB, startDate: Date, endDate: Date): Promise<CashFlow> {
  const [{ transactions }, accounts] = await Promise.all([
    listTransactions(db, { startDate, endDate, limit: 10000 }),
    listAccounts(db),
  ]);
  const creditAccountIds = new Set(accounts.filter(a => a.accountType === 'credit').map(a => a._id));

  let income = 0, expenses = 0;
  for (const txn of transactions) {
    if (txn.pending) continue;
    if (isTransfer(txn, creditAccountIds)) continue;
    const amt = Number(txn.amount);
    if (amt > 0) income += amt;
    else expenses += Math.abs(amt);
  }
  return { income, expenses, net: income - expenses };
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
