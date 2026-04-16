import { describe, it, expect, vi } from 'vitest';
import { listTransactions, listRecentTransactions, getCashFlowThisMonth } from '@/adapters/accounts';
import type { StrictDB } from 'strictdb';
import type { Transaction } from '@/lib/simplefin/types';

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    _id: 'txn-1',
    accountId: 'acc-1',
    posted: new Date('2026-04-01'),
    amount: -42.5,
    description: 'AMAZON',
    memo: null,
    pending: false,
    importedAt: new Date(),
    ...overrides,
  };
}

function makeMockDb(rows: Transaction[]): StrictDB {
  return {
    queryMany: vi.fn().mockResolvedValue(rows),
  } as unknown as StrictDB;
}

describe('listTransactions', () => {
  it('returns transactions and hasMore=false when under limit', async () => {
    const txns = [makeTxn()];
    const db = makeMockDb(txns);
    const { transactions, hasMore } = await listTransactions(db, { limit: 100 });
    expect(transactions).toHaveLength(1);
    expect(hasMore).toBe(false);
  });

  it('returns hasMore=true and trims to limit when over limit', async () => {
    // Return limit+1 rows to signal more available
    const txns = Array.from({ length: 101 }, (_, i) => makeTxn({ _id: `txn-${i}` }));
    const db = makeMockDb(txns);
    const { transactions, hasMore } = await listTransactions(db, { limit: 100 });
    expect(transactions).toHaveLength(100);
    expect(hasMore).toBe(true);
  });

  it('passes accountId filter to db', async () => {
    const db = makeMockDb([]);
    await listTransactions(db, { accountId: 'acc-42' });
    expect(db.queryMany).toHaveBeenCalledWith(
      'transactions',
      expect.objectContaining({ accountId: 'acc-42' }),
      expect.any(Object),
    );
  });

  it('passes date range filter to db', async () => {
    const start = new Date('2026-01-01');
    const end = new Date('2026-03-31');
    const db = makeMockDb([]);
    await listTransactions(db, { startDate: start, endDate: end });
    expect(db.queryMany).toHaveBeenCalledWith(
      'transactions',
      expect.objectContaining({ posted: { $gte: start, $lte: end } }),
      expect.any(Object),
    );
  });

  it('passes offset (skip) to db', async () => {
    const db = makeMockDb([]);
    await listTransactions(db, { offset: 50 });
    expect(db.queryMany).toHaveBeenCalledWith(
      'transactions',
      expect.any(Object),
      expect.objectContaining({ skip: 50 }),
    );
  });

  it('applies no date filter when no dates provided', async () => {
    const db = makeMockDb([]);
    await listTransactions(db, {});
    expect(db.queryMany).toHaveBeenCalledWith(
      'transactions',
      {},
      expect.any(Object),
    );
  });
});

describe('listRecentTransactions', () => {
  it('delegates to listTransactions with 30-day window', async () => {
    const txns = [makeTxn()];
    const db = makeMockDb(txns);
    const result = await listRecentTransactions(db);
    expect(result).toEqual(txns);
    expect(db.queryMany).toHaveBeenCalledWith(
      'transactions',
      expect.objectContaining({ posted: expect.objectContaining({ $gte: expect.any(Date) }) }),
      expect.any(Object),
    );
  });

  it('passes accountId filter through', async () => {
    const db = makeMockDb([]);
    await listRecentTransactions(db, 'acc-99');
    expect(db.queryMany).toHaveBeenCalledWith(
      'transactions',
      expect.objectContaining({ accountId: 'acc-99' }),
      expect.any(Object),
    );
  });
});

describe('getCashFlowThisMonth', () => {
  it('sums income (positive) and expenses (negative) separately', async () => {
    const txns = [
      makeTxn({ _id: 't1', amount: 2000, pending: false }),   // income
      makeTxn({ _id: 't2', amount: -500, pending: false }),   // expense
      makeTxn({ _id: 't3', amount: -150.5, pending: false }), // expense
      makeTxn({ _id: 't4', amount: 300, pending: false }),    // income
    ];
    const db = makeMockDb(txns);
    const result = await getCashFlowThisMonth(db);

    expect(result.income).toBeCloseTo(2300);
    expect(result.expenses).toBeCloseTo(650.5);
    expect(result.net).toBeCloseTo(1649.5);
  });

  it('excludes pending transactions', async () => {
    const txns = [
      makeTxn({ _id: 't1', amount: -100, pending: false }),
      makeTxn({ _id: 't2', amount: -200, pending: true }), // should be excluded
    ];
    const db = makeMockDb(txns);
    const result = await getCashFlowThisMonth(db);

    expect(result.expenses).toBeCloseTo(100);
  });

  it('returns zeros when no transactions exist', async () => {
    const db = makeMockDb([]);
    const result = await getCashFlowThisMonth(db);

    expect(result.income).toBe(0);
    expect(result.expenses).toBe(0);
    expect(result.net).toBe(0);
  });

  it('queries transactions within current month date range', async () => {
    const db = makeMockDb([]);
    await getCashFlowThisMonth(db);

    expect(db.queryMany).toHaveBeenCalledWith(
      'transactions',
      expect.objectContaining({
        posted: expect.objectContaining({
          $gte: expect.any(Date),
          $lte: expect.any(Date),
        }),
      }),
      expect.any(Object),
    );
  });

  it('returns negative net when expenses exceed income', async () => {
    const txns = [
      makeTxn({ _id: 't1', amount: 100, pending: false }),
      makeTxn({ _id: 't2', amount: -500, pending: false }),
    ];
    const db = makeMockDb(txns);
    const result = await getCashFlowThisMonth(db);

    expect(result.net).toBeCloseTo(-400);
  });
});
