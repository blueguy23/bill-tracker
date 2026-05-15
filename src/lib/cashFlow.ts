import type { Transaction } from '@/lib/simplefin/types';
import { classifyTransfer } from '@/lib/classifyTransfer';

export interface CashFlowTotals {
  income: number;
  expenses: number;
  net: number;
}

export interface MonthBucket {
  income: number;
  expenses: number;
}

function resolvePosted(txn: Transaction): Date {
  return txn.posted instanceof Date ? txn.posted : new Date(Number(txn.posted) * 1000);
}

function isExcluded(txn: Transaction, creditAccountIds: Set<string>): boolean {
  if (txn.pending) return true;
  if (txn.isTransfer ?? classifyTransfer(txn, creditAccountIds)) return true;
  return false;
}

export function computeCashFlow(
  transactions: Transaction[],
  creditAccountIds: Set<string>,
  range: { start: number; end: number },
  normalized: boolean,
): CashFlowTotals {
  let income = 0;
  let expenses = 0;

  for (const txn of transactions) {
    if (isExcluded(txn, creditAccountIds)) continue;
    const amt = Number(txn.amount);

    if (normalized && txn.amortize && amt < 0) {
      expenses += spreadAmortized(txn, range);
    } else {
      const posted = resolvePosted(txn);
      if (posted.getTime() < range.start || posted.getTime() >= range.end) continue;
      if (amt > 0) income += amt;
      else expenses += Math.abs(amt);
    }
  }

  return {
    income:   Math.round(income   * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    net:      Math.round((income - expenses) * 100) / 100,
  };
}

export function computeCashFlowSimple(
  transactions: Transaction[],
  creditAccountIds: Set<string>,
): CashFlowTotals {
  let income = 0;
  let expenses = 0;

  for (const txn of transactions) {
    if (isExcluded(txn, creditAccountIds)) continue;
    const amt = Number(txn.amount);
    if (amt > 0) income   += amt;
    else         expenses += Math.abs(amt);
  }

  return { income, expenses, net: income - expenses };
}

export function spreadAmortized(
  txn: Transaction,
  range: { start: number; end: number },
): number {
  const posted = resolvePosted(txn);
  const amt = Number(txn.amount);
  const slice = Math.abs(amt) / 12;
  let total = 0;

  for (let m = 0; m < 12; m++) {
    const sliceMonth = new Date(posted.getFullYear(), posted.getMonth() + m, 1);
    const sliceEnd   = new Date(posted.getFullYear(), posted.getMonth() + m + 1, 1);
    if (sliceEnd.getTime() > range.start && sliceMonth.getTime() < range.end) {
      total += slice;
    }
  }

  return total;
}

export function bucketByMonth(
  transactions: Transaction[],
  creditAccountIds: Set<string>,
  buckets: Map<string, MonthBucket>,
  normalized: boolean,
): void {
  for (const txn of transactions) {
    if (isExcluded(txn, creditAccountIds)) continue;
    const posted = resolvePosted(txn);
    const amt = Number(txn.amount);

    if (normalized && txn.amortize && amt < 0) {
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
}
