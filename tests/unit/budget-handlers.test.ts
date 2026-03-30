import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { handleGetBudgets, handleSetBudget } from '@/handlers/budgets';
import type { StrictDB } from 'strictdb';

// ── DB mock helpers ───────────────────────────────────────────────────────────

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

function makeRequest(body: unknown, category = 'subscriptions'): NextRequest {
  return new NextRequest(`http://localhost/api/v1/budgets/${category}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── handleGetBudgets ──────────────────────────────────────────────────────────

describe('handleGetBudgets', () => {
  it('should return all categories with spending and projections for current month', async () => {
    const budgetDoc = {
      _id: 'subscriptions',
      category: 'subscriptions',
      monthlyAmount: 200,
      rolloverBalance: 0,
      updatedAt: new Date(),
    };
    const transaction = {
      _id: 'txn-1',
      accountId: 'acc-1',
      posted: new Date(),
      amount: -50,
      category: 'subscriptions',
    };

    const db = makeDb({
      queryMany: vi.fn()
        .mockResolvedValueOnce([budgetDoc])    // listBudgets
        .mockResolvedValueOnce([])              // listUnmatchedQuickAdds
        .mockResolvedValueOnce([transaction]), // listTransactionsForMonth
    });

    const res = await handleGetBudgets(db);
    const body = await res.json() as { month: string; budgets: unknown[] };

    expect(res.status).toBe(200);
    expect(body.budgets).toBeInstanceOf(Array);
    expect(body.month).toMatch(/^\d{4}-\d{2}$/);

    const sub = (body.budgets as Array<{ category: string; spent: number; effectiveBudget: number; status: string; burnRate: object }>).find((b) => b.category === 'subscriptions');
    expect(sub).toBeDefined();
    expect(sub!.spent).toBe(50);
    expect(sub!.effectiveBudget).toBe(200);
    expect(sub!.status).toBeDefined();
    expect(sub!.burnRate).toBeDefined();
  });

  it('should return categories with no budget doc with spent but no projections', async () => {
    const transaction = {
      _id: 'txn-1',
      accountId: 'acc-1',
      posted: new Date(),
      amount: -80,
      category: 'utilities',
    };

    const db = makeDb({
      queryMany: vi.fn()
        .mockResolvedValueOnce([])              // listBudgets — no budget for utilities
        .mockResolvedValueOnce([])              // listUnmatchedQuickAdds
        .mockResolvedValueOnce([transaction]), // listTransactionsForMonth
    });

    const res = await handleGetBudgets(db);
    const body = await res.json() as { budgets: Array<{ category: string; spent: number; effectiveBudget: unknown; status: unknown }> };

    const utilities = body.budgets.find((b) => b.category === 'utilities');
    expect(utilities).toBeDefined();
    expect(utilities!.spent).toBe(80);
    expect(utilities!.effectiveBudget).toBeNull();
    expect(utilities!.status).toBeNull();
  });
});

// ── handleSetBudget ───────────────────────────────────────────────────────────

describe('handleSetBudget', () => {
  it('should create a new budget doc for a category that does not exist', async () => {
    const newBudget = {
      _id: 'subscriptions',
      category: 'subscriptions',
      monthlyAmount: 200,
      rolloverBalance: 0,
      updatedAt: new Date(),
    };
    const db = makeDb({
      queryOne: vi.fn()
        .mockResolvedValueOnce(null)       // getBudget (existing check)
        .mockResolvedValueOnce(newBudget), // getBudget (after insert)
    });

    const req = makeRequest({ monthlyAmount: 200 });
    const res = await handleSetBudget(db, 'subscriptions', req);
    const body = await res.json() as { budget: { monthlyAmount: number; rolloverBalance: number } };

    expect(res.status).toBe(200);
    expect(body.budget.monthlyAmount).toBe(200);
    expect(body.budget.rolloverBalance).toBe(0);
  });

  it('should update monthlyAmount without resetting rolloverBalance', async () => {
    const existingBudget = {
      _id: 'subscriptions',
      category: 'subscriptions',
      monthlyAmount: 150,
      rolloverBalance: 25,
      updatedAt: new Date(),
    };
    const updatedBudget = { ...existingBudget, monthlyAmount: 200 };

    const db = makeDb({
      queryOne: vi.fn()
        .mockResolvedValueOnce(existingBudget)  // getBudget (existing check)
        .mockResolvedValueOnce(updatedBudget),  // getBudget (after update)
    });

    const req = makeRequest({ monthlyAmount: 200 });
    const res = await handleSetBudget(db, 'subscriptions', req);
    const body = await res.json() as { budget: { monthlyAmount: number; rolloverBalance: number } };

    expect(body.budget.monthlyAmount).toBe(200);
    expect(body.budget.rolloverBalance).toBe(25);
  });

  it('should return 400 when monthlyAmount is missing', async () => {
    const db = makeDb();
    const req = makeRequest({});
    const res = await handleSetBudget(db, 'subscriptions', req);
    const body = await res.json() as { error: string };

    expect(res.status).toBe(400);
    expect(body.error).toContain('monthlyAmount');
  });

  it('should return 400 when monthlyAmount is not a positive number', async () => {
    const db = makeDb();
    const req = makeRequest({ monthlyAmount: -50 });
    const res = await handleSetBudget(db, 'subscriptions', req);

    expect(res.status).toBe(400);
  });

  it('should return 400 for an invalid category', async () => {
    const db = makeDb();
    const req = makeRequest({ monthlyAmount: 200 }, 'unicorns');
    const res = await handleSetBudget(db, 'unicorns', req);
    const body = await res.json() as { error: string };

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/categor/i);
  });
});
