import { describe, it, expect } from 'vitest';
import {
  resolvePayConfig,
  computePeriodBounds,
  getAdjacentPeriod,
  buildDailyBalances,
  generateBalanceWarning,
} from '@/lib/payPeriod';
import type { IncomePattern } from '@/lib/forecast';
import type { PayPeriodEvent } from '@/types/payPeriod';

function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function makeIncome(overrides: Partial<IncomePattern> = {}): IncomePattern {
  return {
    name: 'Paycheck',
    amount: 2400,
    nextExpected: localDate(2026, 6, 12),
    interval: 'biweekly',
    occurrences: 6,
    ...overrides,
  };
}

describe('resolvePayConfig', () => {
  it('uses profile payFrequency when set', () => {
    const result = resolvePayConfig(
      { payFrequency: 'biweekly', payday: 15 },
      [makeIncome()],
    );
    expect(result).not.toBeNull();
    expect(result!.frequency).toBe('biweekly');
  });

  it('auto-detects from single dominant income pattern', () => {
    const result = resolvePayConfig(
      { payFrequency: null, payday: null },
      [makeIncome({ interval: 'biweekly', amount: 2400 })],
    );
    expect(result).not.toBeNull();
    expect(result!.frequency).toBe('biweekly');
  });

  it('returns null when no income patterns exist', () => {
    const result = resolvePayConfig(
      { payFrequency: null, payday: null },
      [],
    );
    expect(result).toBeNull();
  });

  it('returns null when two competing patterns with different frequencies are ambiguous', () => {
    const result = resolvePayConfig(
      { payFrequency: null, payday: null },
      [
        makeIncome({ name: 'Main Job', amount: 2400, interval: 'biweekly' }),
        makeIncome({ name: 'Side Gig', amount: 1500, interval: 'monthly' }),
      ],
    );
    expect(result).toBeNull();
  });

  it('auto-detects when second pattern is less than 50% of first', () => {
    const result = resolvePayConfig(
      { payFrequency: null, payday: null },
      [
        makeIncome({ name: 'Main Job', amount: 3000, interval: 'biweekly' }),
        makeIncome({ name: 'Small Side', amount: 400, interval: 'monthly' }),
      ],
    );
    expect(result).not.toBeNull();
    expect(result!.frequency).toBe('biweekly');
  });

  it('auto-detects when two patterns have the same frequency', () => {
    const result = resolvePayConfig(
      { payFrequency: null, payday: null },
      [
        makeIncome({ name: 'Main Job', amount: 2400, interval: 'biweekly' }),
        makeIncome({ name: 'Side Job', amount: 1800, interval: 'biweekly' }),
      ],
    );
    expect(result).not.toBeNull();
    expect(result!.frequency).toBe('biweekly');
  });

  it('returns null for unsupported intervals like quarterly', () => {
    const result = resolvePayConfig(
      { payFrequency: null, payday: null },
      [makeIncome({ interval: 'quarterly' })],
    );
    expect(result).toBeNull();
  });
});

describe('computePeriodBounds', () => {
  it('computes biweekly bounds containing the anchor date', () => {
    const anchor = localDate(2026, 5, 15);
    const result = computePeriodBounds(anchor, 'biweekly', localDate(2026, 5, 20));
    expect(result.start.getDate()).toBe(15);
    expect(result.start.getMonth()).toBe(4);
    expect(result.totalDays).toBe(14);
    expect(result.dayNumber).toBe(6);
    expect(result.daysLeft).toBe(8);
  });

  it('computes weekly bounds', () => {
    const anchor = localDate(2026, 5, 18);
    const result = computePeriodBounds(anchor, 'weekly', localDate(2026, 5, 20));
    expect(result.totalDays).toBe(7);
    expect(result.dayNumber).toBe(3);
  });

  it('computes semimonthly first-half bounds', () => {
    const anchor = localDate(2026, 5, 1);
    const result = computePeriodBounds(anchor, 'semimonthly', localDate(2026, 5, 10));
    expect(result.start.getDate()).toBe(1);
    expect(result.end.getDate()).toBe(15);
    expect(result.dayNumber).toBe(10);
  });

  it('computes semimonthly second-half bounds', () => {
    const anchor = localDate(2026, 5, 1);
    const result = computePeriodBounds(anchor, 'semimonthly', localDate(2026, 5, 20));
    expect(result.start.getDate()).toBe(16);
    expect(result.end.getDate()).toBe(31);
    expect(result.dayNumber).toBe(5);
  });

  it('computes monthly bounds wrapping around anchor day', () => {
    const anchor = localDate(2026, 5, 15);
    const result = computePeriodBounds(anchor, 'monthly', localDate(2026, 6, 10));
    expect(result.start.getDate()).toBe(15);
    expect(result.start.getMonth()).toBe(4);
    expect(result.dayNumber).toBe(27);
  });
});

describe('getAdjacentPeriod', () => {
  it('returns the next biweekly period', () => {
    const anchor = localDate(2026, 5, 15);
    const current = computePeriodBounds(anchor, 'biweekly', localDate(2026, 5, 20));
    const next = getAdjacentPeriod(current, 'biweekly', 'next', anchor);
    expect(next.start.getDate()).toBe(29);
    expect(next.start.getMonth()).toBe(4);
    expect(next.totalDays).toBe(14);
  });

  it('returns the previous biweekly period', () => {
    const anchor = localDate(2026, 5, 15);
    const current = computePeriodBounds(anchor, 'biweekly', localDate(2026, 5, 20));
    const prev = getAdjacentPeriod(current, 'biweekly', 'prev', anchor);
    expect(prev.end.getDate()).toBe(14);
    expect(prev.totalDays).toBe(14);
  });
});

describe('buildDailyBalances', () => {
  it('builds daily balances with actual transactions and projected events', () => {
    const start = localDate(2026, 5, 20);
    const end = localDate(2026, 5, 23);

    const transactions = [
      { posted: localDate(2026, 5, 20), amount: -50, description: 'Groceries' },
      { posted: localDate(2026, 5, 21), amount: -30, description: 'Gas' },
    ];

    const projected: PayPeriodEvent[] = [
      { date: localDate(2026, 5, 22), type: 'bill', name: 'Electric', amount: 70, projectedBalance: 0 },
    ];

    const balances = buildDailyBalances(start, end, 1000, transactions, projected);
    expect(balances).toHaveLength(4);
    expect(balances[0]!.balance).toBe(950);
    expect(balances[0]!.isProjected).toBe(false);
    expect(balances[1]!.balance).toBe(920);
  });
});

describe('generateBalanceWarning', () => {
  it('returns warning when balance drops below 100', () => {
    const events: PayPeriodEvent[] = [
      { date: localDate(2026, 5, 28), type: 'bill', name: 'Rent', amount: 250, projectedBalance: 0 },
    ];
    const warning = generateBalanceWarning(events, 300);
    expect(warning).not.toBeNull();
    expect(warning).toContain('$50');
    expect(warning).toContain('Rent');
  });

  it('returns warning when balance goes negative', () => {
    const events: PayPeriodEvent[] = [
      { date: localDate(2026, 5, 28), type: 'bill', name: 'Rent', amount: 500, projectedBalance: 0 },
    ];
    const warning = generateBalanceWarning(events, 300);
    expect(warning).not.toBeNull();
    expect(warning).toContain('negative');
  });

  it('returns null when balance stays comfortable', () => {
    const events: PayPeriodEvent[] = [
      { date: localDate(2026, 5, 28), type: 'bill', name: 'Phone', amount: 50, projectedBalance: 0 },
    ];
    const warning = generateBalanceWarning(events, 2000);
    expect(warning).toBeNull();
  });

  it('warns on lowest dip even if income recovers later', () => {
    const events: PayPeriodEvent[] = [
      { date: localDate(2026, 5, 27), type: 'bill', name: 'Electric', amount: 150, projectedBalance: 0 },
      { date: localDate(2026, 5, 28), type: 'income', name: 'Paycheck', amount: 2400, projectedBalance: 0 },
      { date: localDate(2026, 5, 29), type: 'bill', name: 'Rent', amount: 1200, projectedBalance: 0 },
    ];
    const warning = generateBalanceWarning(events, 200);
    expect(warning).not.toBeNull();
    expect(warning).toContain('Electric');
  });
});
