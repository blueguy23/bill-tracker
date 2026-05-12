import { describe, it, expect } from 'vitest';
import { get, post, patch, del } from './helpers';

describe('GET /api/v1/bills', () => {
  it('returns 200', async () => {
    const res = await get('/api/v1/bills');
    expect(res.status).toBe(200);
  });

  it('returns Content-Type application/json', async () => {
    const res = await get('/api/v1/bills');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('returns a response with a "bills" array', async () => {
    const res = await get('/api/v1/bills');
    const body = await res.json();

    expect(Object.prototype.hasOwnProperty.call(body, 'bills')).toBe(true);
    expect(Array.isArray(body.bills)).toBe(true);
  });

  it('returns only top-level "bills" key', async () => {
    const res = await get('/api/v1/bills');
    const body = await res.json();
    expect(Object.keys(body)).toEqual(['bills']);
  });

  it('each bill has required BillResponse fields', async () => {
    const res = await get('/api/v1/bills');
    const body = await res.json();

    for (const bill of body.bills) {
      expect(typeof bill._id).toBe('string');
      expect(bill._id.length).toBeGreaterThan(0);
      expect(typeof bill.name).toBe('string');
      expect(bill.name.length).toBeGreaterThan(0);
      expect(typeof bill.amount).toBe('number');
      expect(bill.amount).toBeGreaterThanOrEqual(0);
      expect(bill.dueDate === null || typeof bill.dueDate === 'string' || typeof bill.dueDate === 'number').toBe(true);

      const validCategories = ['utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'other'];
      expect(validCategories).toContain(bill.category);
      expect(typeof bill.isPaid).toBe('boolean');
      expect(typeof bill.isAutoPay).toBe('boolean');
      expect(typeof bill.isRecurring).toBe('boolean');

      expect(typeof bill.createdAt).toBe('string');
      expect(new Date(bill.createdAt).getTime()).toBeGreaterThan(0);
      expect(typeof bill.updatedAt).toBe('string');
      expect(new Date(bill.updatedAt).getTime()).toBeGreaterThan(0);
    }
  });

  it('recurring bills have valid recurrenceInterval', async () => {
    const res = await get('/api/v1/bills');
    const body = await res.json();
    const validIntervals = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];

    for (const bill of body.bills) {
      if (bill.isRecurring && bill.dueDate !== null) {
        expect(validIntervals).toContain(bill.recurrenceInterval);
        expect(typeof bill.dueDate).toBe('number');
        expect(bill.dueDate).toBeGreaterThanOrEqual(1);
        expect(bill.dueDate).toBeLessThanOrEqual(31);
      }
    }
  });

  it('non-recurring bills have valid ISO dueDate', async () => {
    const res = await get('/api/v1/bills');
    const body = await res.json();

    for (const bill of body.bills) {
      if (!bill.isRecurring) {
        expect(typeof bill.dueDate).toBe('string');
        expect(Number.isNaN(new Date(bill.dueDate).getTime())).toBe(false);
      }
    }
  });
});

describe('POST /api/v1/bills — validation', () => {
  it('returns 400 when name is missing', async () => {
    const res = await post('/api/v1/bills', {
      amount: 50, dueDate: '2026-06-15', category: 'utilities', isRecurring: false,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.toLowerCase()).toContain('name');
  });

  it('returns 400 when amount is negative', async () => {
    const res = await post('/api/v1/bills', {
      name: 'Electric Bill', amount: -10, dueDate: '2026-06-15', category: 'utilities', isRecurring: false,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.toLowerCase()).toContain('amount');
  });

  it('returns 400 when category is invalid', async () => {
    const res = await post('/api/v1/bills', {
      name: 'Phone Plan', amount: 45, dueDate: '2026-06-15', category: 'not-a-real-category', isRecurring: false,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.toLowerCase()).toContain('category');
  });

  it('returns 400 when recurring bill has non-integer dueDate', async () => {
    const res = await post('/api/v1/bills', {
      name: 'Netflix', amount: 15.99, dueDate: '2026-06-15', category: 'subscriptions',
      isRecurring: true, recurrenceInterval: 'monthly',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.toLowerCase()).toContain('duedate');
  });

  it('returns 400 when recurring bill is missing recurrenceInterval', async () => {
    const res = await post('/api/v1/bills', {
      name: 'Gym Membership', amount: 30, dueDate: 15, category: 'other', isRecurring: true,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.toLowerCase()).toContain('recurrenceinterval');
  });
});

describe('Bills API — individual bill routes', () => {
  it('returns 405 for GET on single-bill route', async () => {
    const res = await get('/api/v1/bills/000000000000000000000000');
    expect(res.status).toBe(405);
  });

  it('returns 404 when patching a non-existent bill', async () => {
    const res = await patch('/api/v1/bills/000000000000000000000000', { isPaid: true });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.toLowerCase()).toContain('not found');
  });

  it('returns 204 when deleting a non-existent bill', async () => {
    const res = await del('/api/v1/bills/000000000000000000000000');
    expect(res.status).toBe(204);
  });
});
