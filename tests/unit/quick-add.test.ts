import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { handleCreateQuickAdd, handleDeleteQuickAdd } from '@/handlers/quickAdd';
import { matchQuickAdds } from '@/lib/budget/dedup';
import type { StrictDB } from 'strictdb';
import type { SpendingTransaction } from '@/lib/budget/engine';
import type { QuickAddTransaction } from '@/types/budget';

// ── DB mock helper ────────────────────────────────────────────────────────────

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

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/v1/quick-adds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── Dedup helpers ─────────────────────────────────────────────────────────────

function txn(overrides: Partial<SpendingTransaction> = {}): SpendingTransaction {
  return {
    _id: 'txn-1',
    accountId: 'acc-1',
    posted: new Date('2026-03-11T00:00:00Z'),
    amount: -5.5,
    category: 'other',
    ...overrides,
  };
}

function qa(overrides: Partial<QuickAddTransaction> = {}): QuickAddTransaction {
  return {
    _id: 'qa-1',
    description: 'Coffee',
    amount: 5.5,
    category: 'other',
    addedAt: new Date('2026-03-10T00:00:00Z'),
    matchedTransactionId: null,
    ...overrides,
  };
}

// ── handleCreateQuickAdd ──────────────────────────────────────────────────────

describe('handleCreateQuickAdd', () => {
  it('should create a quick-add transaction with description, amount, and category', async () => {
    const db = makeDb();
    const req = makeRequest({ description: 'Coffee', amount: 5.5, category: 'other' });

    const res = await handleCreateQuickAdd(db, req);
    const body = await res.json() as { transaction: { description: string; amount: number; matchedTransactionId: null } };

    expect(res.status).toBe(201);
    expect(body.transaction.description).toBe('Coffee');
    expect(body.transaction.amount).toBe(5.5);
    expect(body.transaction.matchedTransactionId).toBeNull();
  });

  it('should return 400 when description is missing', async () => {
    const db = makeDb();
    const req = makeRequest({ amount: 5.5, category: 'other' });

    const res = await handleCreateQuickAdd(db, req);
    expect(res.status).toBe(400);
  });

  it('should return 400 when amount is not positive', async () => {
    const db = makeDb();
    const req = makeRequest({ description: 'X', amount: -10, category: 'other' });

    const res = await handleCreateQuickAdd(db, req);
    expect(res.status).toBe(400);
  });

  it('should return 400 for an invalid category', async () => {
    const db = makeDb();
    const req = makeRequest({ description: 'X', amount: 10, category: 'invalid' });

    const res = await handleCreateQuickAdd(db, req);
    expect(res.status).toBe(400);
  });
});

// ── handleDeleteQuickAdd ──────────────────────────────────────────────────────

describe('handleDeleteQuickAdd', () => {
  it('should delete an existing quick-add and return 204', async () => {
    const db = makeDb({
      deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    });

    const res = await handleDeleteQuickAdd(db, 'qa-1');
    expect(res.status).toBe(204);
  });

  it('should return 404 when quick-add does not exist', async () => {
    const db = makeDb({
      deleteOne: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    });

    const res = await handleDeleteQuickAdd(db, 'nonexistent');
    const body = await res.json() as { error: string };

    expect(res.status).toBe(404);
    expect(body.error).toBe('Transaction not found');
  });
});

// ── matchQuickAdds (dedup) ────────────────────────────────────────────────────

describe('matchQuickAdds (dedup)', () => {
  it('should match a quick-add to a real transaction with same category, similar amount, close date', () => {
    const transaction = txn({ _id: 'txn-abc', amount: -5.5, category: 'other', posted: new Date('2026-03-11T00:00:00Z') });
    const quickAdd = qa({ _id: 'qa-xyz', amount: 5.5, category: 'other', addedAt: new Date('2026-03-10T00:00:00Z') });

    const result = matchQuickAdds([quickAdd], [transaction]);

    expect(result).toHaveLength(1);
    expect(result[0]!.quickAddId).toBe('qa-xyz');
    expect(result[0]!.transactionId).toBe('txn-abc');
  });

  it('should not match when amount differs by more than $0.50', () => {
    const transaction = txn({ amount: -7.0 });
    const quickAdd = qa({ amount: 5.5 });

    const result = matchQuickAdds([quickAdd], [transaction]);
    expect(result).toHaveLength(0);
  });

  it('should not match when dates are more than 3 days apart', () => {
    const transaction = txn({ posted: new Date('2026-03-15T00:00:00Z') });
    const quickAdd = qa({ addedAt: new Date('2026-03-10T00:00:00Z') });

    const result = matchQuickAdds([quickAdd], [transaction]);
    expect(result).toHaveLength(0);
  });

  it('should not match when categories differ', () => {
    const transaction = txn({ category: 'other' });
    const quickAdd = qa({ category: 'subscriptions' });

    const result = matchQuickAdds([quickAdd], [transaction]);
    expect(result).toHaveLength(0);
  });

  it('should not match an already-matched quick-add', () => {
    const transaction = txn();
    const quickAdd = qa({ matchedTransactionId: 'some-id' });

    const result = matchQuickAdds([quickAdd], [transaction]);
    expect(result).toHaveLength(0);
  });
});
