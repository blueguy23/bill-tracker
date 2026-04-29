import { describe, it, expect } from 'vitest';
import { transformAccount, transformTransaction, transformError, inferAccountType } from '@/lib/simplefin/transform';
import type { RawSFINAccount, RawSFINTransaction, RawSFINError } from '@/lib/simplefin/types';

function makeRawAccount(overrides: Partial<RawSFINAccount> = {}): RawSFINAccount {
  return {
    id: 'acc-1',
    org: { name: 'Chase' },
    name: 'Checking ...1234',
    currency: 'USD',
    balance: '1234.56',
    'balance-date': 1743200000,
    transactions: [],
    ...overrides,
  };
}

function makeRawTxn(overrides: Partial<RawSFINTransaction> = {}): RawSFINTransaction {
  return {
    id: 'txn-1',
    posted: 1743100000,
    amount: '-42.50',
    description: 'NETFLIX.COM',
    ...overrides,
  };
}

describe('transformAccount', () => {
  it('should parse balance string to a number', () => {
    const result = transformAccount(makeRawAccount({ balance: '1234.56' }));
    expect(result.balance).toBe(1234.56);
    expect(typeof result.balance).toBe('number');
  });

  it('should parse available-balance string to a number', () => {
    const result = transformAccount(makeRawAccount({ 'available-balance': '1200.00' }));
    expect(result.availableBalance).toBe(1200.00);
  });

  it('should set availableBalance to null when not provided', () => {
    const raw = makeRawAccount();
    delete (raw as Partial<RawSFINAccount>)['available-balance'];
    const result = transformAccount(raw);
    expect(result.availableBalance).toBeNull();
  });

  it('should convert balance-date unix timestamp to a Date', () => {
    const result = transformAccount(makeRawAccount({ 'balance-date': 1743200000 }));
    expect(result.balanceDate).toBeInstanceOf(Date);
    expect(result.balanceDate.getTime()).toBe(1743200000 * 1000);
  });

  it('should map org.name to orgName', () => {
    const result = transformAccount(makeRawAccount({ org: { name: 'Chase' } }));
    expect(result.orgName).toBe('Chase');
  });

  it('should set lastSyncedAt to current time', () => {
    const now = new Date('2026-03-29T03:00:00.000Z');
    const result = transformAccount(makeRawAccount(), now);
    expect(result.lastSyncedAt).toBe(now);
  });

  it('should default holdings to empty array when absent', () => {
    const result = transformAccount(makeRawAccount());
    expect(result.holdings).toEqual([]);
  });

  it('should map holdings when present', () => {
    const holding = {
      id: 'h-1',
      ticker: 'AAPL',
      description: 'Shares of Apple',
      'market-value': '105884.8',
      'cost-basis': '55.00',
      quantity: '550.0',
      currency: 'USD',
    };
    const result = transformAccount(makeRawAccount({ holdings: [holding] }));
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings![0]!.ticker).toBe('AAPL');
    expect(result.holdings![0]!.marketValue).toBe(105884.8);
  });

  it('should pass through extra field', () => {
    const result = transformAccount(makeRawAccount({ extra: { type: 'checking', custom: true } }));
    expect(result.extra).toEqual({ type: 'checking', custom: true });
  });
});

describe('inferAccountType', () => {
  it('should return "checking" for checking account extra.type', () => {
    expect(inferAccountType({ type: 'checking' })).toBe('checking');
  });

  it('should return "credit" for credit card accounts', () => {
    expect(inferAccountType({ type: 'credit' })).toBe('credit');
    expect(inferAccountType({ type: 'credit card' })).toBe('credit');
  });

  it('should return "other" for unknown or missing extra.type', () => {
    expect(inferAccountType({})).toBe('other');
    expect(inferAccountType(undefined)).toBe('other');
    expect(inferAccountType({ type: 'unknown' })).toBe('other');
  });
});

describe('transformTransaction', () => {
  it('should parse amount string to a number', () => {
    const result = transformTransaction(makeRawTxn({ amount: '-42.50' }), 'acc-1');
    expect(result.amount).toBe(-42.50);
    expect(typeof result.amount).toBe('number');
  });

  it('should convert posted unix timestamp to a Date', () => {
    const result = transformTransaction(makeRawTxn({ posted: 1743100000 }), 'acc-1');
    expect(result.posted).toBeInstanceOf(Date);
    expect(result.posted.getTime()).toBe(1743100000 * 1000);
  });

  it('should set accountId from the second argument', () => {
    const result = transformTransaction(makeRawTxn(), 'acc-xyz');
    expect(result.accountId).toBe('acc-xyz');
  });

  it('should set pending from extra.pending', () => {
    const result = transformTransaction(makeRawTxn({ extra: { pending: true } }), 'acc-1');
    expect(result.pending).toBe(true);
  });

  it('should default pending to false when extra is missing', () => {
    const result = transformTransaction(makeRawTxn(), 'acc-1');
    expect(result.pending).toBe(false);
  });

  it('should set memo to null when not provided', () => {
    const result = transformTransaction(makeRawTxn(), 'acc-1');
    expect(result.memo).toBeNull();
  });

  it('should map payee when present', () => {
    const result = transformTransaction(makeRawTxn({ payee: "John's Fishin Shack" }), 'acc-1');
    expect(result.payee).toBe("John's Fishin Shack");
  });

  it('should set payee to undefined when absent', () => {
    const result = transformTransaction(makeRawTxn(), 'acc-1');
    expect(result.payee).toBeUndefined();
  });

  it('should convert transacted_at unix timestamp to a Date', () => {
    const result = transformTransaction(makeRawTxn({ transacted_at: 1777363200 }), 'acc-1');
    expect(result.transactedAt).toBeInstanceOf(Date);
    expect(result.transactedAt!.getTime()).toBe(1777363200 * 1000);
  });

  it('should set transactedAt to undefined when transacted_at is absent', () => {
    const result = transformTransaction(makeRawTxn(), 'acc-1');
    expect(result.transactedAt).toBeUndefined();
  });

  it('should pass through extra field', () => {
    const extra = { pending: false, category: 'food' };
    const result = transformTransaction(makeRawTxn({ extra }), 'acc-1');
    expect(result.extra).toEqual(extra);
  });
});

describe('transformError', () => {
  it('should map type and accountId', () => {
    const raw: RawSFINError = { type: 'NO_DATA', 'account-id': 'acc-1' };
    const result = transformError(raw);
    expect(result.type).toBe('NO_DATA');
    expect(result.accountId).toBe('acc-1');
  });

  it('should strip HTML tags from error messages while preserving text', () => {
    const raw: RawSFINError = { type: 'UNAVAILABLE', message: '<b>Error:</b> please try again' };
    const result = transformError(raw);
    expect(result.message).toBe('Error: please try again');
    expect(result.message).not.toContain('<');
  });

  it('should return undefined message when absent', () => {
    const raw: RawSFINError = { type: 'RATE_LIMIT' };
    const result = transformError(raw);
    expect(result.message).toBeUndefined();
  });
});
