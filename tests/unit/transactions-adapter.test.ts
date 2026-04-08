import { describe, it, expect, vi } from 'vitest';
import { listTransactions, listRecentTransactions } from '@/adapters/accounts';
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
