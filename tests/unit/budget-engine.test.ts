import { describe, it, expect } from 'vitest';

import {
  computeSpending,
  computeEffectiveBudget,
  computeBurnRate,
  computeRollover,
  computeCategoryStatus,
} from '@/lib/budget/engine';
import type { SpendingTransaction } from '@/lib/budget/engine';
import type { QuickAddTransaction } from '@/types/budget';

// Helpers
function txn(overrides: Partial<SpendingTransaction> = {}): SpendingTransaction {
  return {
    _id: 'txn-1',
    accountId: 'acc-1',
    posted: new Date('2026-03-15T00:00:00Z'),
    amount: -50,
    category: 'subscriptions',
    ...overrides,
  };
}

function qa(overrides: Partial<QuickAddTransaction> = {}): QuickAddTransaction {
  return {
    _id: 'qa-1',
    description: 'Test',
    amount: 10,
    category: 'subscriptions',
    addedAt: new Date('2026-03-15T00:00:00Z'),
    matchedTransactionId: null,
    ...overrides,
  };
}

describe('computeSpending', () => {
  it('should sum negative transaction amounts as expenses for the target month', () => {
    const transactions = [
      txn({ amount: -50 }),
      txn({ amount: -30 }),
      txn({ amount: -20 }),
    ];
    expect(computeSpending(transactions, [], 'subscriptions', '2026-03')).toBe(100);
  });

  it('should exclude transactions from other months', () => {
    const transactions = [
      txn({ amount: -50, posted: new Date('2026-03-15T00:00:00Z') }),
      txn({ amount: -30, posted: new Date('2026-04-10T00:00:00Z') }),
    ];
    expect(computeSpending(transactions, [], 'subscriptions', '2026-03')).toBe(50);
  });

  it('should exclude transactions from other categories', () => {
    const transactions = [
      txn({ amount: -50, category: 'subscriptions' }),
      txn({ amount: -80, category: 'utilities' }),
    ];
    expect(computeSpending(transactions, [], 'subscriptions', '2026-03')).toBe(50);
  });

  it('should include quick-add amounts in spending total', () => {
    const transactions = [txn({ amount: -40 })];
    const quickAdds = [qa({ amount: 15, matchedTransactionId: null })];
    expect(computeSpending(transactions, quickAdds, 'subscriptions', '2026-03')).toBe(55);
  });

  it('should exclude matched quick-adds from spending total', () => {
    const quickAdds = [qa({ amount: 20, matchedTransactionId: 'some-txn-id' })];
    expect(computeSpending([], quickAdds, 'subscriptions', '2026-03')).toBe(0);
  });

  it('should ignore positive transaction amounts (credits/refunds)', () => {
    const transactions = [
      txn({ amount: 50 }),   // refund
      txn({ amount: -30 }),  // expense
    ];
    expect(computeSpending(transactions, [], 'subscriptions', '2026-03')).toBe(30);
  });

  it('should return 0 when no transactions or quick-adds match', () => {
    expect(computeSpending([], [], 'subscriptions', '2026-03')).toBe(0);
  });
});

describe('computeEffectiveBudget', () => {
  it('should return monthlyAmount + rolloverBalance', () => {
    expect(computeEffectiveBudget({ monthlyAmount: 200, rolloverBalance: 15.5 })).toBe(215.5);
  });

  it('should handle negative rollover (overage debt)', () => {
    expect(computeEffectiveBudget({ monthlyAmount: 200, rolloverBalance: -30 })).toBe(170);
  });

  it('should handle zero rollover', () => {
    expect(computeEffectiveBudget({ monthlyAmount: 200, rolloverBalance: 0 })).toBe(200);
  });
});

describe('computeRollover', () => {
  it('should return positive rollover when underspent', () => {
    const budget = { monthlyAmount: 200, rolloverBalance: 0 };
    expect(computeRollover(budget, 120)).toBe(80);
  });

  it('should return negative rollover when overspent', () => {
    const budget = { monthlyAmount: 200, rolloverBalance: 0 };
    expect(computeRollover(budget, 250)).toBe(-50);
  });

  it('should include existing rolloverBalance in calculation', () => {
    const budget = { monthlyAmount: 200, rolloverBalance: 20 };
    expect(computeRollover(budget, 180)).toBe(40);
  });
});

describe('computeBurnRate', () => {
  it('should compute linear projected total from spend / days elapsed', () => {
    // Day 10 of March (31 days), spent = 100
    const day10 = new Date('2026-03-10T12:00:00Z');
    const transactions = [
      txn({ amount: -100, posted: new Date('2026-03-05T00:00:00Z') }),
    ];
    const result = computeBurnRate(transactions, [], 'subscriptions', '2026-03', { today: day10 });
    expect(result.linearDailyRate).toBe(10);
    expect(result.linearProjectedTotal).toBe(310);
  });

  it('should compute rolling 7-day average daily rate', () => {
    // today = March 15, last 7 days total spend = 70
    const today = new Date('2026-03-15T12:00:00Z');
    const transactions = [
      txn({ amount: -70, posted: new Date('2026-03-12T00:00:00Z') }),
    ];
    const result = computeBurnRate(transactions, [], 'subscriptions', '2026-03', { today });
    expect(result.rollingAvgDailyRate).toBe(10);
    expect(result.rollingProjectedTotal).toBe(310);
  });

  it('should set divergent=true when linear and rolling differ by >15% of budget', () => {
    // effectiveBudget = 200, need |linear - rolling| > 30
    // Lots of early spend (linear high), no recent spend (rolling low)
    const today = new Date('2026-03-20T12:00:00Z');
    const transactions = [
      // Old transaction — contributes to linear but NOT rolling (>7 days ago)
      txn({ amount: -200, posted: new Date('2026-03-01T00:00:00Z') }),
    ];
    const result = computeBurnRate(transactions, [], 'subscriptions', '2026-03', {
      today,
      effectiveBudget: 200,
    });
    expect(result.divergent).toBe(true);
  });

  it('should set divergent=false when projections are close', () => {
    // All spend in the last 7 days → linear and rolling projections are identical
    const today = new Date('2026-03-07T12:00:00Z');
    const transactions = [
      txn({ amount: -35, posted: new Date('2026-03-03T00:00:00Z') }),
      txn({ amount: -35, posted: new Date('2026-03-06T00:00:00Z') }),
    ];
    const result = computeBurnRate(transactions, [], 'subscriptions', '2026-03', {
      today,
      effectiveBudget: 200,
    });
    expect(result.divergent).toBe(false);
  });

  it('should return zero rates when no transactions exist', () => {
    const day10 = new Date('2026-03-10T12:00:00Z');
    const result = computeBurnRate([], [], 'subscriptions', '2026-03', { today: day10 });
    expect(result.linearDailyRate).toBe(0);
    expect(result.linearProjectedTotal).toBe(0);
    expect(result.rollingAvgDailyRate).toBe(0);
  });
});

describe('computeCategoryStatus', () => {
  it('should return "on_track" when projected total <= effectiveBudget', () => {
    // 170 = 85% of 200, below the 90% warning threshold
    expect(computeCategoryStatus(200, 170)).toBe('on_track');
  });

  it('should return "warning" when projected is between 90% and 100% of budget', () => {
    // 185 / 200 = 92.5%
    expect(computeCategoryStatus(200, 185)).toBe('warning');
  });

  it('should return "over_budget" when projected total > effectiveBudget', () => {
    expect(computeCategoryStatus(200, 250)).toBe('over_budget');
  });
});
