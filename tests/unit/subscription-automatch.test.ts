import { describe, it, expect } from 'vitest';
import { findAutoMatches } from '@/lib/subscriptions/autoMatch';
import type { Transaction } from '@/lib/simplefin/types';
import type { Bill } from '@/types/bill';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const now = new Date();
const thisMonth1st = new Date(now.getFullYear(), now.getMonth(), 1);

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    _id: 'txn-1',
    accountId: 'acc-1',
    posted: new Date(thisMonth1st.getTime() + 1 * MS_PER_DAY), // 2nd of month
    amount: -14.99,
    description: 'NETFLIX',
    memo: null,
    pending: false,
    importedAt: new Date(),
    ...overrides,
  };
}

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    _id: 'bill-1',
    name: 'Netflix',
    amount: 14.99,
    dueDate: 1, // 1st of month
    category: 'subscriptions',
    isPaid: false,
    isAutoPay: true,
    isRecurring: true,
    recurrenceInterval: 'monthly',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('findAutoMatches', () => {
  it('returns a high-confidence match when amount, date, and description all match', () => {
    const result = findAutoMatches([makeTxn()], [makeBill()]);
    expect(result).toHaveLength(1);
    expect(result[0]?.confidence).toBe('high');
    expect(result[0]?.billId).toBe('bill-1');
    expect(result[0]?.transactionId).toBe('txn-1');
  });

  it('returns no match when amount differs by more than $1', () => {
    const txn = makeTxn({ amount: -20.00 });
    expect(findAutoMatches([txn], [makeBill()])).toHaveLength(0);
  });

  it('returns no match when date differs by more than 5 days', () => {
    const txn = makeTxn({
      posted: new Date(thisMonth1st.getTime() + 10 * MS_PER_DAY),
    });
    expect(findAutoMatches([txn], [makeBill()])).toHaveLength(0);
  });

  it('returns medium confidence when amount and date match but description does not', () => {
    const txn = makeTxn({ description: 'UNKNOWN CHARGE' });
    const result = findAutoMatches([txn], [makeBill()]);
    expect(result).toHaveLength(1);
    expect(result[0]?.confidence).toBe('medium');
  });

  it('skips paid bills', () => {
    const bill = makeBill({ isPaid: true });
    expect(findAutoMatches([makeTxn()], [bill])).toHaveLength(0);
  });

  it('skips non-recurring bills', () => {
    const bill = makeBill({ isRecurring: false, dueDate: new Date() });
    expect(findAutoMatches([makeTxn()], [bill])).toHaveLength(0);
  });

  it('does not assign the same transaction to two bills', () => {
    const bills = [
      makeBill({ _id: 'bill-1', name: 'Netflix' }),
      makeBill({ _id: 'bill-2', name: 'Netflix Copy' }),
    ];
    const result = findAutoMatches([makeTxn()], bills);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no bills', () => {
    expect(findAutoMatches([makeTxn()], [])).toHaveLength(0);
  });

  it('returns empty array when no transactions', () => {
    expect(findAutoMatches([], [makeBill()])).toHaveLength(0);
  });
});
