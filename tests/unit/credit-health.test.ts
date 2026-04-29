import { describe, it, expect, vi } from 'vitest';
import {
  buildAccountSummaries,
  buildOverallStats,
  computeHealthScore,
  handleGetCreditSummary,
} from '@/handlers/credit';
import type { Account } from '@/lib/simplefin/types';
import type { CreditAccountSummary, OverallCreditStats, CreditPaymentRecord } from '@/types/credit';
import type { StrictDB } from 'strictdb';

// ── DB mock helpers ───────────────────────────────────────────────────────────

function makeDb(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}): StrictDB {
  return {
    queryOne: vi.fn().mockResolvedValue(null),
    queryMany: vi.fn().mockResolvedValue([]),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'new-id' }),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    ...overrides,
  } as unknown as StrictDB;
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    _id: 'acct-1',
    orgName: 'Test Bank',
    name: 'Visa Platinum',
    currency: 'USD',
    balance: -500, // negative = amount owed (SimpleFIN convention for credit cards)
    availableBalance: 1500,
    balanceDate: new Date('2026-03-28'),
    accountType: 'credit',
    lastSyncedAt: new Date('2026-03-28'),
    holdings: [],
    ...overrides,
  };
}

// ── buildAccountSummaries ─────────────────────────────────────────────────────

describe('buildAccountSummaries', () => {
  it('computes creditLimit and utilization when availableBalance is present', () => {
    // balance = -500 (owe $500), availableBalance = 1500 → limit = 500 + 1500 = 2000, util = 25%
    const account = makeAccount({ balance: -500, availableBalance: 1500 });
    const summary = buildAccountSummaries([account], new Map())[0]!;

    expect(summary.hasLimitData).toBe(true);
    expect(summary.creditLimit).toBe(2000);
    expect(summary.utilization).toBeCloseTo(0.25);
  });

  it('sets hasLimitData false and nulls creditLimit/utilization when availableBalance is null', () => {
    const account = makeAccount({ availableBalance: null });
    const summary = buildAccountSummaries([account], new Map())[0]!;

    expect(summary.hasLimitData).toBe(false);
    expect(summary.creditLimit).toBeNull();
    expect(summary.utilization).toBeNull();
  });

  it('returns 0 utilization for a paid-off card (balance=0, availableBalance=limit)', () => {
    const account = makeAccount({ balance: 0, availableBalance: 2000 });
    const summary = buildAccountSummaries([account], new Map())[0]!;

    expect(summary.utilization).toBe(0);
    expect(summary.creditLimit).toBe(2000);
  });

  it('serializes balanceDate as ISO string', () => {
    const account = makeAccount({ balanceDate: new Date('2026-03-28T00:00:00.000Z') });
    const summary = buildAccountSummaries([account], new Map())[0]!;

    expect(summary.balanceDate).toBe('2026-03-28T00:00:00.000Z');
  });

  it('maps account _id to summary id', () => {
    const account = makeAccount({ _id: 'abc-123' });
    const summary = buildAccountSummaries([account], new Map())[0]!;
    expect(summary.id).toBe('abc-123');
  });
});

// ── buildOverallStats ─────────────────────────────────────────────────────────

describe('buildOverallStats', () => {
  function makeSummary(overrides: Partial<CreditAccountSummary> = {}): CreditAccountSummary {
    return {
      id: 'acct-1', orgName: 'Bank', name: 'Card',
      balance: -500, creditLimit: 2000, availableBalance: 1500, // balance negative = amount owed
      utilization: 0.25, hasLimitData: true,
      balanceDate: '2026-03-28T00:00:00.000Z',
      ...overrides,
    };
  }

  it('sums balance and limit across accounts with limit data', () => {
    const summaries = [
      makeSummary({ balance: -500, creditLimit: 2000 }),
      makeSummary({ id: 'acct-2', balance: -300, creditLimit: 1000 }),
    ];
    const stats = buildOverallStats(summaries);

    expect(stats.totalBalance).toBe(800); // amount owed: 500 + 300
    expect(stats.totalLimit).toBe(3000);
    expect(stats.accountsWithLimitData).toBe(2);
    expect(stats.utilization).toBeCloseTo(800 / 3000);
  });

  it('excludes accounts without limit data from totalLimit and utilization', () => {
    const summaries = [
      makeSummary({ balance: -500, creditLimit: 2000 }),
      makeSummary({ id: 'acct-2', balance: -300, creditLimit: null, hasLimitData: false, utilization: null }),
    ];
    const stats = buildOverallStats(summaries);

    expect(stats.totalBalance).toBe(800); // both balances counted (owed)
    expect(stats.totalLimit).toBe(2000);
    expect(stats.accountsWithLimitData).toBe(1);
    expect(stats.utilization).toBeCloseTo(800 / 2000); // total owed across all cards / known limit
  });

  it('returns utilization null when no accounts have limit data', () => {
    const summaries = [
      makeSummary({ creditLimit: null, hasLimitData: false, utilization: null }),
    ];
    const stats = buildOverallStats(summaries);

    expect(stats.utilization).toBeNull();
    expect(stats.accountsWithLimitData).toBe(0);
  });

  it('returns zero utilization when all accounts are paid off', () => {
    const summaries = [makeSummary({ balance: 0, creditLimit: 2000, utilization: 0 })];
    const stats = buildOverallStats(summaries);
    expect(stats.utilization).toBe(0);
  });
});

// ── computeHealthScore ────────────────────────────────────────────────────────

describe('computeHealthScore', () => {
  function makeOverall(overrides: Partial<OverallCreditStats> = {}): OverallCreditStats {
    return {
      totalBalance: 0, totalLimit: 2000,
      utilization: 0, accountCount: 1, accountsWithLimitData: 1,
      ...overrides,
    };
  }

  function makePayment(accountId: string): CreditPaymentRecord {
    return {
      id: 'pay-1', accountId, accountName: 'Card', orgName: 'Bank',
      amount: -200, posted: new Date().toISOString(), description: 'Payment',
    };
  }

  it('returns null when totalAccounts is 0', () => {
    expect(computeHealthScore(makeOverall({ accountCount: 0 }), [], 0)).toBeNull();
  });

  it('returns 90 for best achievable score (0% util, payment made, all accounts have limit data)', () => {
    const overall = makeOverall({ utilization: 0, accountsWithLimitData: 1 });
    const score = computeHealthScore(overall, [makePayment('acct-1')], 1);
    expect(score).toBe(90); // max: 60 (utilization) + 30 (payment recency)
  });

  it('returns 60 when utilization is 0 but no payments were made', () => {
    const overall = makeOverall({ utilization: 0, accountsWithLimitData: 1 });
    const score = computeHealthScore(overall, [], 1);
    expect(score).toBe(60);
  });

  it('lowers score proportionally with higher utilization', () => {
    const low = computeHealthScore(makeOverall({ utilization: 0.1 }), [], 1);
    const high = computeHealthScore(makeOverall({ utilization: 0.9 }), [], 1);
    expect(low).toBeGreaterThan(high!);
  });

  it('deducts 10 pts per account missing limit data, clamped to 0', () => {
    const overall = makeOverall({ utilization: 0, accountCount: 1, accountsWithLimitData: 0 });
    const score = computeHealthScore(overall, [], 1);
    // 0 util pts (no limit data) + 0 payment pts - 10 penalty = clamped to 0
    expect(score).toBe(0);
  });

  it('returns an integer (Math.round applied)', () => {
    const overall = makeOverall({ utilization: 0.333 });
    const score = computeHealthScore(overall, [], 1);
    expect(Number.isInteger(score)).toBe(true);
  });

  it('clamps score to 100 maximum', () => {
    const overall = makeOverall({ utilization: 0, accountsWithLimitData: 1 });
    const payments = [makePayment('acct-1'), makePayment('acct-1')];
    const score = computeHealthScore(overall, payments, 1);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ── handleGetCreditSummary ────────────────────────────────────────────────────

describe('handleGetCreditSummary', () => {
  const creditAccount = makeAccount();
  const payment = {
    _id: 'txn-1', accountId: 'acct-1',
    posted: new Date('2026-03-20'),
    amount: -200, description: 'PAYMENT THANK YOU',
    memo: null, pending: false, importedAt: new Date(),
  };

  it('returns 200 with correct top-level shape when accounts exist', async () => {
    const db = makeDb({
      queryMany: vi.fn()
        .mockResolvedValueOnce([creditAccount]) // listCreditAccounts
        .mockResolvedValueOnce([payment])        // listCreditTransactions (Promise.all[0])
        .mockResolvedValueOnce([]),              // listAccountMeta (Promise.all[1])
    });

    const res = await handleGetCreditSummary(db);
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(Array.isArray(body.accounts)).toBe(true);
    expect(body.overall).toBeTruthy();
    expect(Array.isArray(body.recentPayments)).toBe(true);
    expect(typeof body.score === 'number' || body.score === null).toBe(true);
  });

  it('returns score null and empty arrays when no credit accounts', async () => {
    const db = makeDb({ queryMany: vi.fn().mockResolvedValue([]) });
    const res = await handleGetCreditSummary(db);
    const body = await res.json() as Record<string, unknown>;

    expect(body.score).toBeNull();
    expect(body.accounts).toEqual([]);
    expect(body.recentPayments).toEqual([]);
  });

  it('only includes transactions with amount < 0 in recentPayments', async () => {
    const charge = { ...payment, _id: 'txn-2', amount: 50 };
    const db = makeDb({
      queryMany: vi.fn()
        .mockResolvedValueOnce([creditAccount])
        .mockResolvedValueOnce([payment, charge])
        .mockResolvedValueOnce([]),
    });

    const res = await handleGetCreditSummary(db);
    const body = await res.json() as { recentPayments: Array<{ amount: number }> };
    expect(body.recentPayments.every((p) => p.amount < 0)).toBe(true);
  });

  it('caps recentPayments at 10 entries', async () => {
    const manyPayments = Array.from({ length: 20 }, (_, i) => ({
      ...payment, _id: `txn-${i}`, amount: -50,
    }));
    const db = makeDb({
      queryMany: vi.fn()
        .mockResolvedValueOnce([creditAccount])
        .mockResolvedValueOnce(manyPayments)
        .mockResolvedValueOnce([]),
    });

    const res = await handleGetCreditSummary(db);
    const body = await res.json() as { recentPayments: unknown[] };
    expect(body.recentPayments.length).toBeLessThanOrEqual(10);
  });
});
