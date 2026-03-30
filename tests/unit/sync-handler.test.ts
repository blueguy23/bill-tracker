import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runDailySync, runHistoricalImport, QuotaExceededError } from '@/handlers/sync';
import type { StrictDB } from 'strictdb';
import type { SimpleFINClient } from '@/lib/simplefin/client';
import type { SyncLog, Account, Transaction } from '@/lib/simplefin/types';

function makeSyncLog(overrides: Partial<SyncLog> = {}): SyncLog {
  return {
    _id: 'log-1',
    date: new Date().toISOString().slice(0, 10),
    requestCount: 0,
    lastSyncAt: null,
    lastSyncType: null,
    historicalImportDone: false,
    ...overrides,
  };
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    _id: 'acc-1',
    orgName: 'Chase',
    name: 'Checking',
    currency: 'USD',
    balance: 1000,
    availableBalance: null,
    balanceDate: new Date(),
    accountType: 'checking',
    lastSyncedAt: new Date(),
    ...overrides,
  };
}

function makeMockDb(logOverrides: Partial<SyncLog> = {}): StrictDB {
  const log = makeSyncLog(logOverrides);
  return {
    queryOne: vi.fn().mockImplementation((_col: string, filter: Record<string, unknown>) => {
      if (filter.date !== undefined) return Promise.resolve(log);
      return Promise.resolve(null); // transactions not found → new
    }),
    queryMany: vi.fn().mockResolvedValue([]),
    insertOne: vi.fn().mockResolvedValue({ insertedCount: 1 }),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
  } as unknown as StrictDB;
}

function makeMockClient(accounts: Account[] = [makeAccount()], txns: Transaction[] = []): SimpleFINClient {
  return {
    fetchAccounts: vi.fn().mockResolvedValue({ accounts, transactions: txns, errors: [] }),
  } as unknown as SimpleFINClient;
}

describe('quota guard', () => {
  it('should block sync when requestCount >= QUOTA_GUARD (20)', async () => {
    const db = makeMockDb({ requestCount: 20 });
    const client = makeMockClient();
    await expect(runDailySync(db, client)).rejects.toBeInstanceOf(QuotaExceededError);
    expect(client.fetchAccounts).not.toHaveBeenCalled();
  });

  it('should allow sync when requestCount < QUOTA_GUARD', async () => {
    const db = makeMockDb({ requestCount: 19 });
    const client = makeMockClient();
    await expect(runDailySync(db, client)).resolves.not.toThrow();
    expect(client.fetchAccounts).toHaveBeenCalledOnce();
  });

  it('should increment requestCount by 1 after a successful sync', async () => {
    const db = makeMockDb({ requestCount: 5 });
    const client = makeMockClient();
    const result = await runDailySync(db, client);
    expect(db.updateOne).toHaveBeenCalled();
    expect(result.quotaUsed).toBe(6);
  });
});

describe('syncLog — today record', () => {
  it('should create a new syncLog document for a new UTC day', async () => {
    const db = {
      queryOne: vi.fn().mockResolvedValue(null), // not found → new day
      insertOne: vi.fn().mockResolvedValue({ insertedCount: 1 }),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      queryMany: vi.fn().mockResolvedValue([]),
    } as unknown as StrictDB;
    const { getTodayLog } = await import('@/adapters/syncLog');
    const log = await getTodayLog(db);
    expect(db.insertOne).toHaveBeenCalledOnce();
    expect(log.requestCount).toBe(0);
    expect(log.historicalImportDone).toBe(false);
    expect(log.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return the existing syncLog document for today', async () => {
    const existing = makeSyncLog({ requestCount: 3 });
    const db = {
      queryOne: vi.fn().mockResolvedValue(existing),
      insertOne: vi.fn(),
    } as unknown as StrictDB;
    const { getTodayLog } = await import('@/adapters/syncLog');
    const log = await getTodayLog(db);
    expect(db.insertOne).not.toHaveBeenCalled();
    expect(log.requestCount).toBe(3);
  });
});

describe('daily sync', () => {
  it('should fetch transactions starting from ~3 days ago', async () => {
    const db = makeMockDb();
    const client = makeMockClient();
    const before = Date.now();
    await runDailySync(db, client);
    const after = Date.now();
    const calledWith = (client.fetchAccounts as ReturnType<typeof vi.fn>).mock.calls[0]![0] as { startDate: Date };
    const diff = after - calledWith.startDate.getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    expect(diff).toBeGreaterThanOrEqual(threeDaysMs - 60_000);
    expect(diff).toBeLessThanOrEqual(threeDaysMs + 60_000);
  });

  it('should upsert accounts on every sync', async () => {
    const accounts = [makeAccount({ _id: 'acc-1' }), makeAccount({ _id: 'acc-2' })];
    const db = makeMockDb();
    const client = makeMockClient(accounts);
    const result = await runDailySync(db, client);
    expect(result.accountsUpdated).toBe(2);
  });

  it('should skip inserting a transaction that already exists and is settled', async () => {
    const existing: Transaction = {
      _id: 'txn-1', accountId: 'acc-1', posted: new Date(), amount: -42.5,
      description: 'NETFLIX', memo: null, pending: false, importedAt: new Date(),
    };
    const db = {
      ...makeMockDb(),
      queryOne: vi.fn().mockImplementation((_col: string, filter: Record<string, unknown>) => {
        if (filter.date !== undefined) return Promise.resolve(makeSyncLog());
        if (filter._id === 'txn-1') return Promise.resolve(existing); // settled exists
        return Promise.resolve(null);
      }),
    } as unknown as StrictDB;
    const client = makeMockClient([makeAccount()], [existing]);
    await runDailySync(db, client);
    // updateOne called for account upsert + quota, but NOT for the settled txn
    const txnUpsertCalls = (db.updateOne as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => (c[0] as string) === 'transactions',
    );
    expect(txnUpsertCalls).toHaveLength(0);
  });

  it('should re-upsert a pending transaction when it settles', async () => {
    const pendingTxn: Transaction = {
      _id: 'txn-p', accountId: 'acc-1', posted: new Date(), amount: -10,
      description: 'AMZN', memo: null, pending: true, importedAt: new Date(),
    };
    const settledTxn = { ...pendingTxn, pending: false };
    const db = {
      ...makeMockDb(),
      queryOne: vi.fn().mockImplementation((_col: string, filter: Record<string, unknown>) => {
        if (filter.date !== undefined) return Promise.resolve(makeSyncLog());
        if (filter._id === 'txn-p') return Promise.resolve(pendingTxn); // was pending
        return Promise.resolve(null);
      }),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    } as unknown as StrictDB;
    const client = makeMockClient([makeAccount()], [settledTxn]);
    const result = await runDailySync(db, client);
    expect(result.transactionsUpserted).toBe(1);
  });

  it('should return a sync result with counts', async () => {
    const accounts = [makeAccount()];
    const db = makeMockDb();
    const client = makeMockClient(accounts, []);
    const result = await runDailySync(db, client);
    expect(result.accountsUpdated).toBe(1);
    expect(typeof result.transactionsUpserted).toBe('number');
    expect(typeof result.quotaUsed).toBe('number');
  });
});

describe('historical import', () => {
  it('should skip historical import if already done', async () => {
    const db = makeMockDb({ historicalImportDone: true });
    const client = makeMockClient();
    const result = await runHistoricalImport(db, client);
    expect(client.fetchAccounts).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
  });

  it('should make 3 sequential API calls for 90-day history (3 x 30 days)', async () => {
    const db = makeMockDb({ historicalImportDone: false });
    const client = makeMockClient();
    await runHistoricalImport(db, client);
    expect(client.fetchAccounts).toHaveBeenCalledTimes(3);
    const calls = (client.fetchAccounts as ReturnType<typeof vi.fn>).mock.calls as Array<[{ startDate: Date }]>;
    const dates = calls.map((c) => c[0]!.startDate.getTime());
    // Oldest chunk first (largest offset)
    expect(dates[0]).toBeLessThan(dates[1]!);
    expect(dates[1]).toBeLessThan(dates[2]!);
  });

  it('should set historicalImportDone = true after all chunks succeed', async () => {
    const db = makeMockDb({ historicalImportDone: false });
    const client = makeMockClient();
    await runHistoricalImport(db, client);
    const updateCalls = (db.updateOne as ReturnType<typeof vi.fn>).mock.calls as Array<[string, unknown, { $set: Record<string, unknown> }]>;
    const doneCall = updateCalls.find((c) => c[2]?.$set?.historicalImportDone === true);
    expect(doneCall).toBeDefined();
  });

  it('should not set historicalImportDone if a chunk fails', async () => {
    const db = makeMockDb({ historicalImportDone: false });
    const client = {
      fetchAccounts: vi.fn()
        .mockResolvedValueOnce({ accounts: [], transactions: [], errors: [] })
        .mockRejectedValueOnce(new Error('Network failure')),
    } as unknown as SimpleFINClient;
    await expect(runHistoricalImport(db, client)).rejects.toThrow('Network failure');
    const updateCalls = (db.updateOne as ReturnType<typeof vi.fn>).mock.calls as Array<[string, unknown, { $set: Record<string, unknown> }]>;
    const doneCall = updateCalls.find((c) => c[2]?.$set?.historicalImportDone === true);
    expect(doneCall).toBeUndefined();
  });
});

describe('NO_DATA error handling', () => {
  it('should continue syncing other accounts when one returns NO_DATA', async () => {
    const db = makeMockDb();
    const client = {
      fetchAccounts: vi.fn().mockResolvedValue({
        accounts: [makeAccount()],
        transactions: [],
        errors: [{ type: 'NO_DATA', accountId: 'acc-bad' }],
      }),
    } as unknown as SimpleFINClient;
    const result = await runDailySync(db, client);
    expect(result.accountsUpdated).toBe(1);
    expect(result.warnings.some((w) => w.includes('NO_DATA'))).toBe(true);
  });
});
