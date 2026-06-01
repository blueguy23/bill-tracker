import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findBestMatch, detectAutoPayments } from '@/handlers/autoPayDetect';
import type { Bill } from '@/types/bill';
import type { Transaction } from '@/lib/simplefin/types';

vi.mock('@/adapters/bills', () => ({
  listBills: vi.fn(),
  updateBill: vi.fn(),
}));
vi.mock('@/adapters/payments', () => ({
  createPayment: vi.fn(),
}));
vi.mock('@/handlers/notifications', () => ({
  notifyPriceIncrease: vi.fn(),
  notifyPriceDecrease: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    _id: 'bill-1',
    name: 'Netflix Streaming',
    amount: 100,
    dueDate: 15,
    category: 'subscriptions',
    isPaid: false,
    isAutoPay: true,
    isRecurring: true,
    paidMonth: '2026-04',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    _id: 'txn-1',
    accountId: 'acc-1',
    posted: new Date('2026-05-15'),
    amount: -100,
    description: 'NETFLIX STREAMING',
    memo: null,
    pending: false,
    importedAt: new Date(),
    ...overrides,
  };
}

describe('findBestMatch', () => {
  it('matches by bill name longest word', () => {
    const bill = makeBill({ name: 'Netflix Streaming' });
    const txns = [makeTxn({ description: 'NETFLIX.COM STREAMING SVC' })];
    const result = findBestMatch(bill, txns);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe('name');
  });

  it('matches by paymentDescriptionHint', () => {
    const bill = makeBill({ paymentDescriptionHint: 'NFLX' });
    const txns = [makeTxn({ description: 'NFLX DIGITAL SVC' })];
    const result = findBestMatch(bill, txns);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe('hint');
  });

  it('rejects when amount is outside ±30% window', () => {
    const bill = makeBill({ amount: 100 });
    const txns = [makeTxn({ amount: -150 })];
    const result = findBestMatch(bill, txns);
    expect(result).toBeNull();
  });

  it('falls through from stale hint to name matching', () => {
    const bill = makeBill({
      name: 'Netflix Streaming',
      paymentDescriptionHint: 'OLD_STALE_HINT',
    });
    const txns = [makeTxn({ description: 'NETFLIX STREAMING SVC' })];
    const result = findBestMatch(bill, txns);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe('name');
  });

  it('returns null when stale hint fails AND name also fails', () => {
    const bill = makeBill({
      name: 'AT&T',
      paymentDescriptionHint: 'OLD_STALE_HINT',
    });
    const txns = [makeTxn({ description: 'VERIZON WIRELESS' })];
    const result = findBestMatch(bill, txns);
    expect(result).toBeNull();
  });
});

describe('detectAutoPayments — price alerts', () => {
  let mockDb: any;
  let notifyIncrease: any;
  let notifyDecrease: any;
  let listBills: any;
  let updateBill: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00.000Z'));

    const notifications = await import('@/handlers/notifications');
    notifyIncrease = vi.mocked(notifications.notifyPriceIncrease);
    notifyDecrease = vi.mocked(notifications.notifyPriceDecrease);

    const billsModule = await import('@/adapters/bills');
    listBills = vi.mocked(billsModule.listBills);
    updateBill = vi.mocked(billsModule.updateBill);

    mockDb = {
      queryMany: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('$100 bill charges $100 — no alert', async () => {
    listBills.mockResolvedValue([makeBill({ amount: 100 })]);
    mockDb.queryMany.mockResolvedValue([makeTxn({ amount: -100, description: 'NETFLIX STREAMING' })]);
    updateBill.mockResolvedValue(null);

    await detectAutoPayments(mockDb);

    expect(notifyIncrease).not.toHaveBeenCalled();
    expect(notifyDecrease).not.toHaveBeenCalled();
  });

  it('$100 bill charges $110 — increase alert fires', async () => {
    listBills.mockResolvedValue([makeBill({ amount: 100 })]);
    mockDb.queryMany.mockResolvedValue([makeTxn({ amount: -110, description: 'NETFLIX STREAMING' })]);
    updateBill.mockResolvedValue(null);

    await detectAutoPayments(mockDb);

    expect(notifyIncrease).toHaveBeenCalledOnce();
    expect(notifyIncrease.mock.calls[0][1]).toMatchObject({
      previousAmount: 100,
      newAmount: 110,
    });
    expect(notifyDecrease).not.toHaveBeenCalled();
  });

  it('$110 bill (lastChargedAmount:110) charges $110 — no alert', async () => {
    listBills.mockResolvedValue([makeBill({ amount: 100, lastChargedAmount: 110 })]);
    mockDb.queryMany.mockResolvedValue([makeTxn({ amount: -110, description: 'NETFLIX STREAMING' })]);
    updateBill.mockResolvedValue(null);

    await detectAutoPayments(mockDb);

    expect(notifyIncrease).not.toHaveBeenCalled();
    expect(notifyDecrease).not.toHaveBeenCalled();
  });

  it('$110 bill (lastChargedAmount:110) charges $95 — decrease alert fires', async () => {
    listBills.mockResolvedValue([makeBill({ amount: 100, lastChargedAmount: 110 })]);
    mockDb.queryMany.mockResolvedValue([makeTxn({ amount: -95, description: 'NETFLIX STREAMING' })]);
    updateBill.mockResolvedValue(null);

    await detectAutoPayments(mockDb);

    expect(notifyDecrease).toHaveBeenCalledOnce();
    expect(notifyDecrease.mock.calls[0][1]).toMatchObject({
      previousAmount: 110,
      newAmount: 95,
    });
    expect(notifyIncrease).not.toHaveBeenCalled();
  });
});
