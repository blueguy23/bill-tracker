import { test, expect } from '@playwright/test';

test.describe('GET /api/v1/summary', () => {
  test('returns 400 when month parameter is missing', async ({ request }) => {
    const res = await request.get('/api/v1/summary');
    expect(res.status()).toBe(400);

    const body = await res.json() as { error: string };
    expect(body.error).toContain('month');
  });

  test('returns 400 for invalid month format', async ({ request }) => {
    const res = await request.get('/api/v1/summary?month=2026-13-01');
    expect(res.status()).toBe(400);

    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });

  test('returns 200 with correct shape for valid month', async ({ request }) => {
    const res = await request.get('/api/v1/summary?month=2026-05');
    expect(res.status()).toBe(200);

    const body = await res.json() as {
      income: number;
      expenses: number;
      net: number;
      transactionCount: number;
      topMerchants: { merchant: string; total: number; count: number }[];
    };
    expect(typeof body.income).toBe('number');
    expect(typeof body.expenses).toBe('number');
    expect(typeof body.net).toBe('number');
    expect(typeof body.transactionCount).toBe('number');
    expect(Array.isArray(body.topMerchants)).toBe(true);
  });

  test('net equals income minus expenses', async ({ request }) => {
    const res = await request.get('/api/v1/summary?month=2026-05');
    const body = await res.json() as { income: number; expenses: number; net: number };

    expect(body.net).toBeCloseTo(body.income - body.expenses, 2);
  });

  test('topMerchants entries have required fields', async ({ request }) => {
    const res = await request.get('/api/v1/summary?month=2026-05');
    const body = await res.json() as {
      topMerchants: { merchant: string; total: number; count: number }[];
    };

    for (const m of body.topMerchants) {
      expect(typeof m.merchant).toBe('string');
      expect(typeof m.total).toBe('number');
      expect(typeof m.count).toBe('number');
      expect(m.total).toBeGreaterThan(0);
      expect(m.count).toBeGreaterThanOrEqual(1);
    }
  });

  test('topMerchants are sorted by total descending', async ({ request }) => {
    const res = await request.get('/api/v1/summary?month=2026-05');
    const body = await res.json() as {
      topMerchants: { total: number }[];
    };

    for (let i = 1; i < body.topMerchants.length; i++) {
      expect(body.topMerchants[i]!.total).toBeLessThanOrEqual(body.topMerchants[i - 1]!.total);
    }
  });
});
