import { describe, it, expect } from 'vitest';
import { get } from './helpers';

describe('GET /api/v1/summary', () => {
  it('returns 400 when month parameter is missing', async () => {
    const res = await get('/api/v1/summary');
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('month');
  });

  it('returns 400 for invalid month format', async () => {
    const res = await get('/api/v1/summary?month=2026-13-01');
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 200 with correct shape for valid month', async () => {
    const res = await get('/api/v1/summary?month=2026-05');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(typeof body.income).toBe('number');
    expect(typeof body.expenses).toBe('number');
    expect(typeof body.net).toBe('number');
    expect(typeof body.transactionCount).toBe('number');
    expect(Array.isArray(body.topMerchants)).toBe(true);
  });

  it('net equals income minus expenses', async () => {
    const res = await get('/api/v1/summary?month=2026-05');
    const body = await res.json();
    expect(body.net).toBeCloseTo(body.income - body.expenses, 2);
  });

  it('topMerchants entries have required fields', async () => {
    const res = await get('/api/v1/summary?month=2026-05');
    const body = await res.json();

    for (const m of body.topMerchants) {
      expect(typeof m.merchant).toBe('string');
      expect(typeof m.total).toBe('number');
      expect(typeof m.count).toBe('number');
      expect(m.total).toBeGreaterThan(0);
      expect(m.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('topMerchants are sorted by total descending', async () => {
    const res = await get('/api/v1/summary?month=2026-05');
    const body = await res.json();

    for (let i = 1; i < body.topMerchants.length; i++) {
      expect(body.topMerchants[i].total).toBeLessThanOrEqual(body.topMerchants[i - 1].total);
    }
  });
});
