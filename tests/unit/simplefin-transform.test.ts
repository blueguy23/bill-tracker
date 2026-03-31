import { describe, it, expect } from 'vitest';
import { transformAccount, transformTransaction, inferAccountType } from '@/lib/simplefin/transform';
import type { RawSFINAccount, RawSFINTransaction } from '@/lib/simplefin/types';

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
});
