import { describe, it, expect } from 'vitest';
import { detectSubscriptions } from '@/lib/subscriptions/detect';
import type { Transaction } from '@/lib/simplefin/types';
import type { Bill } from '@/types/bill';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    _id: `txn-${Math.random().toString(36).slice(2)}`,
    accountId: 'acc-1',
    posted: new Date('2026-03-01'),
    amount: -14.99,
    description: 'NETFLIX',
    memo: null,
    pending: false,
    importedAt: new Date(),
    ...overrides,
  };
}

function makeMonthlyTxns(description: string, startDate: Date, count: number, amount = -14.99): Transaction[] {
  return Array.from({ length: count }, (_, i) => makeTxn({
    _id: `txn-${description}-${i}`,
    description,
    amount,
    posted: new Date(startDate.getTime() + i * 30 * MS_PER_DAY),
  }));
}

function makeWeeklyTxns(description: string, startDate: Date, count: number, amount = -9.99): Transaction[] {
  return Array.from({ length: count }, (_, i) => makeTxn({
    _id: `txn-${description}-${i}`,
    description,
    amount,
    posted: new Date(startDate.getTime() + i * 7 * MS_PER_DAY),
  }));
}

const NO_BILLS: Bill[] = [];

describe('detectSubscriptions', () => {
  it('returns empty array when fewer than 2 transactions total', () => {
    const result = detectSubscriptions([makeTxn()], NO_BILLS);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when all transactions are pending', () => {
    const txns = makeMonthlyTxns('SPOTIFY', new Date('2026-01-01'), 3).map((t) => ({ ...t, pending: true }));
    expect(detectSubscriptions(txns, NO_BILLS)).toHaveLength(0);
  });

  it('returns empty when only one transaction per merchant', () => {
    const txns = [
      makeTxn({ _id: 'a', description: 'NETFLIX', amount: -14.99 }),
      makeTxn({ _id: 'b', description: 'SPOTIFY', amount: -9.99 }),
    ];
    expect(detectSubscriptions(txns, NO_BILLS)).toHaveLength(0);
  });

  it('detects a monthly subscription from 3 transactions', () => {
    const txns = makeMonthlyTxns('NETFLIX', new Date('2026-01-01'), 3);
    const result = detectSubscriptions(txns, NO_BILLS);
    expect(result).toHaveLength(1);
    expect(result[0]?.interval).toBe('monthly');
    expect(result[0]?.occurrences).toBe(3);
  });

  it('detects a weekly pattern from 4 transactions', () => {
    const txns = makeWeeklyTxns('COFFEE SUBSCRIPTION', new Date('2026-01-01'), 4);
    const result = detectSubscriptions(txns, NO_BILLS);
    expect(result).toHaveLength(1);
    expect(result[0]?.interval).toBe('weekly');
  });

  it('sets confidence high for 3+ consistent occurrences', () => {
    const txns = makeMonthlyTxns('SPOTIFY', new Date('2026-01-01'), 3);
    const result = detectSubscriptions(txns, NO_BILLS);
    expect(result[0]?.confidence).toBe('high');
  });

  it('sets confidence medium for exactly 2 consistent occurrences', () => {
    const txns = makeMonthlyTxns('HULU', new Date('2026-01-01'), 2);
    const result = detectSubscriptions(txns, NO_BILLS);
    expect(result[0]?.confidence).toBe('medium');
  });

  it('sets amountVariance true when amounts differ by more than 10%', () => {
    const start = new Date('2026-01-01');
    const txns = [
      makeTxn({ _id: 't1', description: 'ELECTRIC', amount: -100, posted: new Date(start.getTime()) }),
      makeTxn({ _id: 't2', description: 'ELECTRIC', amount: -120, posted: new Date(start.getTime() + 30 * MS_PER_DAY) }),
      makeTxn({ _id: 't3', description: 'ELECTRIC', amount: -115, posted: new Date(start.getTime() + 60 * MS_PER_DAY) }),
    ];
    const result = detectSubscriptions(txns, NO_BILLS);
    expect(result[0]?.amountVariance).toBe(true);
  });

  it('sets amountVariance false when amounts are identical', () => {
    const txns = makeMonthlyTxns('NETFLIX', new Date('2026-01-01'), 3, -15.49);
    const result = detectSubscriptions(txns, NO_BILLS);
    expect(result[0]?.amountVariance).toBe(false);
  });

  it('excludes groups matching an existing bill name', () => {
    const txns = makeMonthlyTxns('NETFLIX', new Date('2026-01-01'), 3);
    const bills: Bill[] = [{
      _id: 'bill-1', name: 'Netflix', amount: 14.99,
      dueDate: 1, category: 'subscriptions', isPaid: false,
      isAutoPay: true, isRecurring: true, recurrenceInterval: 'monthly',
      createdAt: new Date(), updatedAt: new Date(),
    }];
    const result = detectSubscriptions(txns, bills);
    expect(result).toHaveLength(0);
  });

  it('does not return transactions with positive amounts', () => {
    const txns = makeMonthlyTxns('REFUND', new Date('2026-01-01'), 3, 14.99); // positive
    expect(detectSubscriptions(txns, NO_BILLS)).toHaveLength(0);
  });

  it('id is deterministic across two calls with the same input', () => {
    const txns = makeMonthlyTxns('SPOTIFY', new Date('2026-01-01'), 3);
    const r1 = detectSubscriptions(txns, NO_BILLS);
    const r2 = detectSubscriptions(txns, NO_BILLS);
    expect(r1[0]?.id).toBe(r2[0]?.id);
  });

  it('nextEstimated is approximately lastCharged + 30 days for monthly', () => {
    const txns = makeMonthlyTxns('NETFLIX', new Date('2026-01-01'), 3);
    const result = detectSubscriptions(txns, NO_BILLS);
    const sub = result[0];
    expect(sub).toBeDefined();
    if (!sub) return;
    const diff = (sub.nextEstimated.getTime() - sub.lastCharged.getTime()) / MS_PER_DAY;
    expect(diff).toBeCloseTo(30, 0);
  });
});
