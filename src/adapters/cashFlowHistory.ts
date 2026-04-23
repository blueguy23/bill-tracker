import type { StrictDB } from 'strictdb';
import { listTransactions, listAccounts } from '@/adapters/accounts';
import type { Transaction } from '@/lib/simplefin/types';

export interface MonthlyFlow {
  label: string;
  income: number;
  expenses: number;
  net: number;
}

// Descriptions that indicate inter-account transfers (not real income/expense)
const TRANSFER_DESCRIPTION_RE = /^(deposit from |transfer from |transfer to |online transfer|account transfer)/i;

// Build a regex that also catches self-Zelle if the owner name is configured
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

/**
 * Returns true if the transaction is an internal transfer and should be
 * excluded from cash flow totals.
 *
 * Rules:
 * 1. Positive amount on a credit-type account = credit card payment received (not income)
 * 2. Description matches common bank-transfer patterns = inter-account move
 * 3. Description matches self-Zelle pattern (requires TRANSFER_OWNER_NAME env var)
 */
function isTransfer(txn: Transaction, creditAccountIds: Set<string>): boolean {
  if (creditAccountIds.has(txn.accountId) && txn.amount > 0) return true;
  return getTransferRe().test(txn.description);
}

export async function getCashFlowHistory(db: StrictDB, months = 6): Promise<MonthlyFlow[]> {
  const now = new Date();

  // Fetch accounts to identify credit-type accounts (credit card payments show as positive income but aren't)
  const accounts = await listAccounts(db);
  const creditAccountIds = new Set(
    accounts.filter(a => a.accountType === 'credit').map(a => a._id)
  );

  // Fetch all transactions in the full window in one query — avoids N sequential queries
  const windowStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const windowEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const { transactions } = await listTransactions(db, {
    startDate: windowStart,
    endDate:   windowEnd,
    limit:     20000,
  });

  // Bucket into months
  const buckets = new Map<string, { income: number; expenses: number }>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.set(key, { income: 0, expenses: 0 });
  }

  for (const t of transactions) {
    if (t.pending) continue;
    if (isTransfer(t, creditAccountIds)) continue;
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
