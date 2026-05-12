import { describe, it, expect } from 'vitest';
import { get, put } from './helpers';

describe('GET /api/v1/budgets', () => {
  it('returns 200', async () => {
    const res = await get('/api/v1/budgets');
    expect(res.status).toBe(200);
  });

  it('returns Content-Type application/json', async () => {
    const res = await get('/api/v1/budgets');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('returns "month" string and "budgets" array', async () => {
    const res = await get('/api/v1/budgets');
    const body = await res.json();

    expect(typeof body.month).toBe('string');
    expect(Array.isArray(body.budgets)).toBe(true);
  });

  it('returns month in YYYY-MM format', async () => {
    const res = await get('/api/v1/budgets');
    const body = await res.json();

    expect(body.month).toMatch(/^\d{4}-\d{2}$/);
    const [year, month] = body.month.split('-').map(Number);
    expect(year).toBeGreaterThanOrEqual(2020);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
  });

  it('returns all 6 bill categories', async () => {
    const res = await get('/api/v1/budgets');
    const body = await res.json();

    const expected = ['utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'other'];
    const returned = body.budgets.map((b: { category: string }) => b.category).sort();
    expect(returned).toEqual(expected.slice().sort());
  });

  it('each budget item has correct shape', async () => {
    const res = await get('/api/v1/budgets');
    const body = await res.json();
    const validCategories = ['utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'other'];

    for (const budget of body.budgets) {
      expect(validCategories).toContain(budget.category);
      expect(budget.monthlyAmount === null || typeof budget.monthlyAmount === 'number').toBe(true);
      if (typeof budget.monthlyAmount === 'number') {
        expect(budget.monthlyAmount).toBeGreaterThan(0);
      }
      expect(typeof budget.spent).toBe('number');
      expect(budget.spent).toBeGreaterThanOrEqual(0);
      expect(typeof budget.rolloverBalance).toBe('number');
      expect(budget.effectiveBudget === null || typeof budget.effectiveBudget === 'number').toBe(true);
      expect(budget.remaining === null || typeof budget.remaining === 'number').toBe(true);
      expect(budget.status === null || typeof budget.status === 'string').toBe(true);
    }
  });

  it('returns the current month', async () => {
    const res = await get('/api/v1/budgets');
    const body = await res.json();

    const now = new Date();
    const expected = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    expect(body.month).toBe(expected);
  });
});

describe('PUT /api/v1/budgets/:category — validation', () => {
  it('returns 400 for invalid category', async () => {
    const res = await put('/api/v1/budgets/not-a-real-category', { monthlyAmount: 200 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.toLowerCase()).toContain('category');
  });

  it('returns 400 when monthlyAmount is missing', async () => {
    const res = await put('/api/v1/budgets/utilities', {});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.toLowerCase()).toContain('monthlyamount');
  });

  it('returns 400 when monthlyAmount is zero', async () => {
    const res = await put('/api/v1/budgets/utilities', { monthlyAmount: 0 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.toLowerCase()).toContain('monthlyamount');
  });
});
