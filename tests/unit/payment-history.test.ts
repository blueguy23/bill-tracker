import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPayment, listPaymentsForBill } from '@/adapters/payments';
import type { StrictDB } from 'strictdb';
import type { PaymentRecord } from '@/types/payment';

function makeMockDb(overrides: Partial<Record<string, unknown>> = {}): StrictDB {
  return {
    insertOne: vi.fn().mockResolvedValue({ insertedCount: 1 }),
    queryMany: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    ...overrides,
  } as unknown as StrictDB;
}

function makePayment(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    _id: 'pay-1',
    billId: 'bill-1',
    billName: 'Netflix',
    amount: 15.99,
    paidAt: new Date('2026-03-15T10:00:00.000Z'),
    ...overrides,
  };
}

describe('payments adapter', () => {
  describe('createPayment', () => {
    it('should insert a payment record with billId, billName, amount, and paidAt', async () => {
      const db = makeMockDb();
      const result = await createPayment(db, { billId: 'bill-1', billName: 'Netflix', amount: 15.99 });
      expect(result.billId).toBe('bill-1');
      expect(result.billName).toBe('Netflix');
      expect(result.amount).toBe(15.99);
      expect(result.paidAt).toBeInstanceOf(Date);
      expect(db.insertOne).toHaveBeenCalledOnce();
    });

    it('should generate a unique _id for each payment', async () => {
      const db = makeMockDb();
      const p1 = await createPayment(db, { billId: 'bill-1', billName: 'Netflix', amount: 15.99 });
      const p2 = await createPayment(db, { billId: 'bill-1', billName: 'Netflix', amount: 15.99 });
      expect(p1._id).not.toBe(p2._id);
      expect(p1._id).toMatch(/^[0-9a-f-]{36}$/);
      expect(p2._id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('listPaymentsForBill', () => {
    it('should return payments for the given billId sorted newest first', async () => {
      const payments = [
        makePayment({ _id: 'p3', paidAt: new Date('2026-03-15T00:00:00.000Z') }),
        makePayment({ _id: 'p2', paidAt: new Date('2026-02-15T00:00:00.000Z') }),
        makePayment({ _id: 'p1', paidAt: new Date('2026-01-15T00:00:00.000Z') }),
      ];
      const db = makeMockDb({ queryMany: vi.fn().mockResolvedValue(payments) });
      const result = await listPaymentsForBill(db, 'bill-1');
      expect(result).toHaveLength(3);
      expect(result[0]!._id).toBe('p3');
      expect(result[2]!._id).toBe('p1');
    });

    it('should return an empty array when the bill has no payment history', async () => {
      const db = makeMockDb({ queryMany: vi.fn().mockResolvedValue([]) });
      const result = await listPaymentsForBill(db, 'unknown-id');
      expect(result).toEqual([]);
    });
  });
});

describe('handleListPayments', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('GET /api/v1/bills/:id/payments', () => {
    it('should return 200 with payments array when bill exists', async () => {
      const { handleListPayments } = await import('@/handlers/payments');
      const payments = [makePayment(), makePayment({ _id: 'pay-2' })];
      const db = makeMockDb({
        queryOne: vi.fn().mockResolvedValue({ _id: 'bill-1', name: 'Netflix' }),
        queryMany: vi.fn().mockResolvedValue(payments),
      });
      const res = await handleListPayments(db, 'bill-1');
      const body = await res.json() as { payments: unknown[] };
      expect(res.status).toBe(200);
      expect(body.payments).toHaveLength(2);
      expect(body.payments[0]).toMatchObject({ _id: 'pay-1', billId: 'bill-1', billName: 'Netflix', amount: 15.99 });
    });

    it('should return 200 with empty array when bill exists but has no payments', async () => {
      const { handleListPayments } = await import('@/handlers/payments');
      const db = makeMockDb({
        queryOne: vi.fn().mockResolvedValue({ _id: 'bill-1' }),
        queryMany: vi.fn().mockResolvedValue([]),
      });
      const res = await handleListPayments(db, 'bill-1');
      const body = await res.json() as { payments: unknown[] };
      expect(res.status).toBe(200);
      expect(body.payments).toEqual([]);
    });

    it('should return 404 when bill does not exist', async () => {
      const { handleListPayments } = await import('@/handlers/payments');
      const db = makeMockDb({ queryOne: vi.fn().mockResolvedValue(null) });
      const res = await handleListPayments(db, 'nonexistent-id');
      const body = await res.json() as { error: string };
      expect(res.status).toBe(404);
      expect(body.error).toBe('Bill not found');
    });

    it('should serialize paidAt as an ISO string in the response', async () => {
      const { handleListPayments } = await import('@/handlers/payments');
      const db = makeMockDb({
        queryOne: vi.fn().mockResolvedValue({ _id: 'bill-1' }),
        queryMany: vi.fn().mockResolvedValue([makePayment()]),
      });
      const res = await handleListPayments(db, 'bill-1');
      const body = await res.json() as { payments: Array<{ paidAt: unknown }> };
      expect(typeof body.payments[0]!.paidAt).toBe('string');
      expect(() => new Date(body.payments[0]!.paidAt as string).toISOString()).not.toThrow();
    });
  });
});

describe('payment creation on isPaid toggle', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should create a payment record when isPaid changes from false to true', async () => {
    const { updateBill } = await import('@/adapters/bills');
    const existingBill = { _id: 'bill-1', name: 'Netflix', amount: 15.99, isPaid: false };
    const insertOne = vi.fn().mockResolvedValue({ insertedCount: 1 });
    const db = makeMockDb({
      queryOne: vi.fn().mockResolvedValue(existingBill),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      insertOne,
    });
    await updateBill(db, 'bill-1', { isPaid: true });
    expect(insertOne).toHaveBeenCalledOnce();
    const inserted = (insertOne.mock.calls[0] as unknown[])[1] as PaymentRecord;
    expect(inserted.billId).toBe('bill-1');
    expect(inserted.amount).toBe(15.99);
  });

  it('should NOT create a payment record when isPaid is already true', async () => {
    const { updateBill } = await import('@/adapters/bills');
    const existingBill = { _id: 'bill-1', name: 'Netflix', amount: 15.99, isPaid: true };
    const insertOne = vi.fn().mockResolvedValue({ insertedCount: 1 });
    const db = makeMockDb({
      queryOne: vi.fn().mockResolvedValue(existingBill),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      insertOne,
    });
    await updateBill(db, 'bill-1', { isPaid: true });
    expect(insertOne).not.toHaveBeenCalled();
  });

  it('should NOT create a payment record when isPaid changes to false', async () => {
    const { updateBill } = await import('@/adapters/bills');
    const existingBill = { _id: 'bill-1', name: 'Netflix', amount: 15.99, isPaid: true };
    const insertOne = vi.fn().mockResolvedValue({ insertedCount: 1 });
    const db = makeMockDb({
      queryOne: vi.fn().mockResolvedValue(existingBill),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      insertOne,
    });
    await updateBill(db, 'bill-1', { isPaid: false });
    expect(insertOne).not.toHaveBeenCalled();
  });

  it('should NOT create a payment record when PATCH does not touch isPaid', async () => {
    const { updateBill } = await import('@/adapters/bills');
    const existingBill = { _id: 'bill-1', name: 'Netflix', amount: 15.99, isPaid: false };
    const insertOne = vi.fn().mockResolvedValue({ insertedCount: 1 });
    const db = makeMockDb({
      queryOne: vi.fn().mockResolvedValue(existingBill),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      insertOne,
    });
    await updateBill(db, 'bill-1', { amount: 200 });
    expect(insertOne).not.toHaveBeenCalled();
  });
});
