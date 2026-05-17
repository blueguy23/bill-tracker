import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildForecast,
  detectIncomePatterns,
  type ForecastBill,
  type ForecastSub,
  type IncomePattern,
  type ForecastInput,
} from '@/lib/forecast';
import type { Transaction } from '@/lib/simplefin/types';

const DAY = 24 * 60 * 60 * 1000;

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    _id: 'txn-1',
    accountId: 'acc-1',
    posted: new Date('2026-05-01'),
    amount: 2000,
    description: 'ACME CORP PAYROLL',
    memo: null,
    pending: false,
    importedAt: new Date(),
    ...overrides,
  };
}

describe('buildForecast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('should return 91 days (today + 90)', () => {
    const result = buildForecast({
      currentBalance: 5000,
      bills: [],
      subscriptions: [],
      incomePatterns: [],
    });
    expect(result).toHaveLength(91);
    expect(result[0]!.date).toBe('2026-06-01');
    expect(result[90]!.date).toBe('2026-08-30');
  });

  it('should start at currentBalance when no events exist', () => {
    const result = buildForecast({
      currentBalance: 10000,
      bills: [],
      subscriptions: [],
      incomePatterns: [],
    });
    expect(result[0]!.balance).toBe(10000);
    expect(result[45]!.balance).toBe(10000);
    expect(result[90]!.balance).toBe(10000);
  });

  it('should subtract bill amounts on due dates', () => {
    const bills: ForecastBill[] = [{
      name: 'Rent',
      amount: 1500,
      dueDate: 15,
      recurrenceInterval: 'monthly',
    }];
    const result = buildForecast({
      currentBalance: 5000,
      bills,
      subscriptions: [],
      incomePatterns: [],
    });
    const jun15 = result.find((d) => d.date === '2026-06-15');
    expect(jun15).toBeDefined();
    expect(jun15!.events).toHaveLength(1);
    expect(jun15!.events[0]!.type).toBe('bill');
    expect(jun15!.events[0]!.name).toBe('Rent');
    expect(jun15!.events[0]!.amount).toBe(-1500);
    expect(jun15!.balance).toBe(3500);
  });

  it('should project monthly bills across multiple months', () => {
    const bills: ForecastBill[] = [{
      name: 'Internet',
      amount: 80,
      dueDate: 5,
      recurrenceInterval: 'monthly',
    }];
    const result = buildForecast({
      currentBalance: 1000,
      bills,
      subscriptions: [],
      incomePatterns: [],
    });
    const jul5 = result.find((d) => d.date === '2026-07-05');
    const aug5 = result.find((d) => d.date === '2026-08-05');
    expect(jul5!.events).toHaveLength(1);
    expect(aug5!.events).toHaveLength(1);
  });

  it('should add income events as positive balance changes', () => {
    const incomePatterns: IncomePattern[] = [{
      name: 'Payroll',
      amount: 3000,
      nextExpected: new Date(2026, 5, 15),
      interval: 'biweekly',
      occurrences: 4,
    }];
    const result = buildForecast({
      currentBalance: 1000,
      bills: [],
      subscriptions: [],
      incomePatterns,
    });
    const jun15 = result.find((d) => d.date === '2026-06-15');
    expect(jun15!.events[0]!.type).toBe('income');
    expect(jun15!.events[0]!.amount).toBe(3000);
    expect(jun15!.balance).toBe(4000);
  });

  it('should subtract subscription charges', () => {
    const subscriptions: ForecastSub[] = [{
      name: 'Netflix',
      amount: 15.99,
      nextEstimated: new Date(2026, 5, 10),
      interval: 'monthly',
    }];
    const result = buildForecast({
      currentBalance: 500,
      bills: [],
      subscriptions,
      incomePatterns: [],
    });
    const jun10 = result.find((d) => d.date === '2026-06-10');
    expect(jun10!.events[0]!.type).toBe('subscription');
    expect(jun10!.events[0]!.amount).toBe(-15.99);
    expect(jun10!.balance).toBeCloseTo(484.01, 2);
  });

  it('should accumulate multiple events on the same day', () => {
    const input: ForecastInput = {
      currentBalance: 5000,
      bills: [{ name: 'Rent', amount: 1500, dueDate: 15, recurrenceInterval: 'monthly' }],
      subscriptions: [],
      incomePatterns: [{ name: 'Payroll', amount: 3000, nextExpected: new Date(2026, 5, 15), interval: 'monthly', occurrences: 3 }],
    };
    const result = buildForecast(input);
    const jun15 = result.find((d) => d.date === '2026-06-15');
    expect(jun15!.events).toHaveLength(2);
    expect(jun15!.balance).toBe(5000 - 1500 + 3000);
  });
});

describe('detectIncomePatterns', () => {
  it('should detect biweekly income from recurring positive transactions', () => {
    const transactions: Transaction[] = [
      makeTxn({ _id: 't1', posted: new Date('2026-04-03'), amount: 2000, description: 'ACME CORP PAYROLL' }),
      makeTxn({ _id: 't2', posted: new Date('2026-04-17'), amount: 2000, description: 'ACME CORP PAYROLL' }),
      makeTxn({ _id: 't3', posted: new Date('2026-05-01'), amount: 2000, description: 'ACME CORP PAYROLL' }),
    ];
    const result = detectIncomePatterns(transactions);
    expect(result).toHaveLength(1);
    expect(result[0]!.interval).toBe('biweekly');
    expect(result[0]!.amount).toBe(2000);
    expect(result[0]!.occurrences).toBe(3);
  });

  it('should detect monthly income', () => {
    const transactions: Transaction[] = [
      makeTxn({ _id: 't1', posted: new Date('2026-03-01'), amount: 5000, description: 'EMPLOYER DIRECT DEP' }),
      makeTxn({ _id: 't2', posted: new Date('2026-04-01'), amount: 5000, description: 'EMPLOYER DIRECT DEP' }),
      makeTxn({ _id: 't3', posted: new Date('2026-05-01'), amount: 5000, description: 'EMPLOYER DIRECT DEP' }),
    ];
    const result = detectIncomePatterns(transactions);
    expect(result).toHaveLength(1);
    expect(result[0]!.interval).toBe('monthly');
  });

  it('should ignore pending and transfer transactions', () => {
    const transactions: Transaction[] = [
      makeTxn({ _id: 't1', posted: new Date('2026-04-01'), amount: 500, pending: true }),
      makeTxn({ _id: 't2', posted: new Date('2026-05-01'), amount: 500, pending: true }),
    ];
    const result = detectIncomePatterns(transactions);
    expect(result).toHaveLength(0);
  });

  it('should ignore negative amounts (expenses)', () => {
    const transactions: Transaction[] = [
      makeTxn({ _id: 't1', posted: new Date('2026-04-01'), amount: -100 }),
      makeTxn({ _id: 't2', posted: new Date('2026-05-01'), amount: -100 }),
    ];
    const result = detectIncomePatterns(transactions);
    expect(result).toHaveLength(0);
  });

  it('should require at least 2 occurrences', () => {
    const transactions: Transaction[] = [
      makeTxn({ _id: 't1', posted: new Date('2026-05-01'), amount: 3000 }),
    ];
    const result = detectIncomePatterns(transactions);
    expect(result).toHaveLength(0);
  });
});
