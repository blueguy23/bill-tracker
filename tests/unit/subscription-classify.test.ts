import { describe, it, expect } from 'vitest';
import { classifyRecurringType } from '@/lib/subscriptions/classify';
import type { Transaction } from '@/lib/simplefin/types';

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    _id: `txn-${Math.random().toString(36).slice(2)}`,
    accountId: 'acc-1',
    posted: new Date('2026-03-01'),
    amount: -14.99,
    description: 'MERCHANT',
    memo: null,
    pending: false,
    importedAt: new Date(),
    ...overrides,
  };
}

describe('classifyRecurringType', () => {
  it('classifies as subscription when Trove category is subscriptions', () => {
    const txns = [
      makeTxn({ category: 'subscriptions' }),
      makeTxn({ category: 'subscriptions' }),
    ];
    const result = classifyRecurringType(txns, 'netflix', false);
    expect(result.type).toBe('subscription');
    expect(result.subScore).toBeGreaterThan(result.billScore);
  });

  it('classifies as bill when Trove category is utilities', () => {
    const txns = [
      makeTxn({ category: 'utilities' }),
      makeTxn({ category: 'utilities' }),
    ];
    const result = classifyRecurringType(txns, 'con edison', true);
    expect(result.type).toBe('bill');
    expect(result.billScore).toBeGreaterThan(result.subScore);
  });

  it('amount variance pushes toward bill classification', () => {
    const txns = [makeTxn(), makeTxn()]; // no category
    const withVariance    = classifyRecurringType(txns, 'unknown merchant', true);
    const withoutVariance = classifyRecurringType(txns, 'unknown merchant', false);
    expect(withVariance.billScore).toBeGreaterThan(withoutVariance.billScore);
    expect(withoutVariance.subScore).toBeGreaterThan(withVariance.subScore);
  });

  it('keyword fallback classifies Netflix as subscription when no Trove data', () => {
    const txns = [makeTxn(), makeTxn()]; // no category enrichment
    const result = classifyRecurringType(txns, 'netflix', false);
    expect(result.type).toBe('subscription');
  });

  it('keyword fallback classifies electric as bill when no Trove data', () => {
    const txns = [makeTxn(), makeTxn()]; // no category enrichment
    const result = classifyRecurringType(txns, 'electric', true);
    expect(result.type).toBe('bill');
  });

  it('returns recurring when bill and sub signals tie', () => {
    // health category: billScore += 1, amountVariance=false: subScore += 1 → tie
    const txns = [makeTxn({ category: 'health' })];
    const result = classifyRecurringType(txns, 'insurance payment', false);
    expect(result.type).toBe('recurring');
    expect(result.billScore).toBe(result.subScore);
  });

  it('confidence is high when score gap >= 4', () => {
    const txns = [
      makeTxn({ category: 'utilities' }),
      makeTxn({ category: 'utilities' }),
    ];
    // utilities: 3+3=6 bill, 0 sub, + variance 2 = 8 bill vs 0 sub → gap 8
    const result = classifyRecurringType(txns, 'electric', true);
    expect(result.confidence).toBe('high');
  });

  it('confidence is low when score gap < 2', () => {
    const txns = [makeTxn(), makeTxn()]; // no signals at all
    const result = classifyRecurringType(txns, 'some unknown payment', false);
    // subScore = 1 (no variance), billScore = 0 → gap = 1
    expect(result.confidence).toBe('low');
  });

  it('Trove signal overrides keyword fallback', () => {
    // "electric" keyword would suggest bill, but Trove says subscriptions
    const txns = [
      makeTxn({ category: 'subscriptions' }),
      makeTxn({ category: 'subscriptions' }),
    ];
    const result = classifyRecurringType(txns, 'electric', false);
    // enrichedCount > 0 so keyword fallback skipped; sub wins via Trove
    expect(result.type).toBe('subscription');
  });
});
