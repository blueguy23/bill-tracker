import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Health API — GET /api/v1/health
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Health API (GET /api/v1/health)', () => {
  test('should return HTTP 200', async ({ request }) => {
    const response = await request.get('/api/v1/health');

    expect(response.status()).toBe(200);
  });

  test('should return status "ok"', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    const body = await response.json() as { status: unknown; timestamp: unknown };

    expect(body.status).toBe('ok');
  });

  test('should return a valid ISO 8601 timestamp', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    const body = await response.json() as { status: string; timestamp: string };

    expect(typeof body.timestamp).toBe('string');
    const parsed = new Date(body.timestamp);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    // ISO 8601 pattern includes the T separator and Z or offset
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('should return timestamp that is recent (within 30 seconds of request time)', async ({ request }) => {
    const before = Date.now();
    const response = await request.get('/api/v1/health');
    const after = Date.now();

    const body = await response.json() as { timestamp: string };
    const ts = new Date(body.timestamp).getTime();

    expect(ts).toBeGreaterThanOrEqual(before - 5000); // 5s for clock drift tolerance
    expect(ts).toBeLessThanOrEqual(after + 1000);
  });

  test('should return Content-Type application/json', async ({ request }) => {
    const response = await request.get('/api/v1/health');

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('should return exactly the expected top-level keys', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    const body = await response.json() as Record<string, unknown>;

    const keys = Object.keys(body).sort();
    expect(keys).toEqual(['checks', 'responseTimeMs', 'status', 'timestamp', 'uptime']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bills API — GET /api/v1/bills
// ─────────────────────────────────────────────────────────────────────────────

// Loose shape used for iteration — we assert types inline so unknown is intentional
interface BillShape {
  _id: string;
  name: string;
  amount: unknown;
  dueDate: unknown;
  category: unknown;
  isPaid: unknown;
  isAutoPay: unknown;
  isRecurring: unknown;
  recurrenceInterval?: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

test.describe('Bills API (GET /api/v1/bills)', () => {
  test('should return HTTP 200', async ({ request }) => {
    const response = await request.get('/api/v1/bills');

    expect(response.status()).toBe(200);
  });

  test('should return Content-Type application/json', async ({ request }) => {
    const response = await request.get('/api/v1/bills');

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('should return a response object with a "bills" array property', async ({ request }) => {
    const response = await request.get('/api/v1/bills');
    const body = await response.json() as { bills: unknown };

    expect(Object.prototype.hasOwnProperty.call(body, 'bills')).toBe(true);
    expect(Array.isArray(body.bills)).toBe(true);
  });

  test('should return only top-level "bills" key in the response', async ({ request }) => {
    const response = await request.get('/api/v1/bills');
    const body = await response.json() as Record<string, unknown>;

    const keys = Object.keys(body);
    expect(keys).toEqual(['bills']);
  });

  test('should return bills where each item has all required BillResponse fields', async ({ request }) => {
    const response = await request.get('/api/v1/bills');
    const body = await response.json() as { bills: BillShape[] };

    // Only validate shape if there are bills; empty array is valid
    for (const bill of body.bills) {
      expect(typeof bill._id).toBe('string');
      expect(bill._id.length).toBeGreaterThan(0);

      expect(typeof bill.name).toBe('string');
      expect(bill.name.length).toBeGreaterThan(0);

      expect(typeof bill.amount).toBe('number');
      expect(bill.amount as number).toBeGreaterThanOrEqual(0);

      // dueDate is either a string (ISO date for one-off) or a number (day-of-month for recurring)
      expect(typeof bill.dueDate === 'string' || typeof bill.dueDate === 'number').toBe(true);

      const validCategories = ['utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'other'];
      expect(validCategories).toContain(bill.category);

      expect(typeof bill.isPaid).toBe('boolean');
      expect(typeof bill.isAutoPay).toBe('boolean');
      expect(typeof bill.isRecurring).toBe('boolean');

      // createdAt and updatedAt must be ISO date strings
      expect(typeof bill.createdAt).toBe('string');
      expect(() => new Date(bill.createdAt as string)).not.toThrow();
      expect(new Date(bill.createdAt as string).getTime()).toBeGreaterThan(0);

      expect(typeof bill.updatedAt).toBe('string');
      expect(() => new Date(bill.updatedAt as string)).not.toThrow();
      expect(new Date(bill.updatedAt as string).getTime()).toBeGreaterThan(0);
    }
  });

  test('should return valid recurrenceInterval on recurring bills', async ({ request }) => {
    const response = await request.get('/api/v1/bills');
    const body = await response.json() as { bills: BillShape[] };

    const validIntervals = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];

    for (const bill of body.bills) {
      if (bill.isRecurring) {
        expect(validIntervals).toContain(bill.recurrenceInterval);
        // dueDate for recurring bills must be a number (day of month 1-31)
        expect(typeof bill.dueDate).toBe('number');
        expect(bill.dueDate as number).toBeGreaterThanOrEqual(1);
        expect(bill.dueDate as number).toBeLessThanOrEqual(31);
      }
    }
  });

  test('should return valid ISO dueDate string on non-recurring bills', async ({ request }) => {
    const response = await request.get('/api/v1/bills');
    const body = await response.json() as { bills: BillShape[] };

    for (const bill of body.bills) {
      if (!bill.isRecurring) {
        expect(typeof bill.dueDate).toBe('string');
        const parsed = new Date(bill.dueDate as string);
        expect(Number.isNaN(parsed.getTime())).toBe(false);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bills API — POST /api/v1/bills (validation)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Bills API (POST /api/v1/bills — validation)', () => {
  test('should return 400 when body is missing required name field', async ({ request }) => {
    const response = await request.post('/api/v1/bills', {
      data: {
        amount: 50,
        dueDate: '2026-06-15',
        category: 'utilities',
        isRecurring: false,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json() as { error: string };
    expect(typeof body.error).toBe('string');
    expect(body.error.toLowerCase()).toContain('name');
  });

  test('should return 400 when amount is negative', async ({ request }) => {
    const response = await request.post('/api/v1/bills', {
      data: {
        name: 'Electric Bill',
        amount: -10,
        dueDate: '2026-06-15',
        category: 'utilities',
        isRecurring: false,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json() as { error: string };
    expect(typeof body.error).toBe('string');
    expect(body.error.toLowerCase()).toContain('amount');
  });

  test('should return 400 when category is not a valid enum value', async ({ request }) => {
    const response = await request.post('/api/v1/bills', {
      data: {
        name: 'Phone Plan',
        amount: 45,
        dueDate: '2026-06-15',
        category: 'not-a-real-category',
        isRecurring: false,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json() as { error: string };
    expect(typeof body.error).toBe('string');
    expect(body.error.toLowerCase()).toContain('category');
  });

  test('should return 400 when recurring bill has non-integer dueDate', async ({ request }) => {
    const response = await request.post('/api/v1/bills', {
      data: {
        name: 'Netflix',
        amount: 15.99,
        dueDate: '2026-06-15',  // wrong type for recurring — should be integer 1-31
        category: 'subscriptions',
        isRecurring: true,
        recurrenceInterval: 'monthly',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json() as { error: string };
    expect(typeof body.error).toBe('string');
    expect(body.error.toLowerCase()).toContain('duedate');
  });

  test('should return 400 when recurring bill is missing recurrenceInterval', async ({ request }) => {
    const response = await request.post('/api/v1/bills', {
      data: {
        name: 'Gym Membership',
        amount: 30,
        dueDate: 15,
        category: 'other',
        isRecurring: true,
        // recurrenceInterval intentionally omitted
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json() as { error: string };
    expect(typeof body.error).toBe('string');
    expect(body.error.toLowerCase()).toContain('recurrenceinterval');
  });

  test('should return 400 when body is not valid JSON', async ({ request }) => {
    const response = await request.post('/api/v1/bills', {
      headers: { 'Content-Type': 'application/json' },
      data: 'this is not json {{{',
    });

    expect(response.status()).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Budgets API — GET /api/v1/budgets
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Budgets API (GET /api/v1/budgets)', () => {
  test('should return HTTP 200', async ({ request }) => {
    const response = await request.get('/api/v1/budgets');

    expect(response.status()).toBe(200);
  });

  test('should return Content-Type application/json', async ({ request }) => {
    const response = await request.get('/api/v1/budgets');

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('should return a response with "month" string and "budgets" array', async ({ request }) => {
    const response = await request.get('/api/v1/budgets');
    const body = await response.json() as { month: unknown; budgets: unknown };

    expect(typeof body.month).toBe('string');
    expect(Array.isArray(body.budgets)).toBe(true);
  });

  test('should return "month" in YYYY-MM format', async ({ request }) => {
    const response = await request.get('/api/v1/budgets');
    const body = await response.json() as { month: string };

    expect(body.month).toMatch(/^\d{4}-\d{2}$/);
    const [year, month] = body.month.split('-').map(Number);
    expect(year).toBeGreaterThanOrEqual(2020);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
  });

  test('should return all 6 bill categories in the budgets array', async ({ request }) => {
    const response = await request.get('/api/v1/budgets');
    const body = await response.json() as { budgets: Array<{ category: string }> };

    const expectedCategories = ['utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'other'];
    const returnedCategories = body.budgets.map((b) => b.category).sort();
    expect(returnedCategories).toEqual(expectedCategories.slice().sort());
  });

  test('should return correct shape for each budget item', async ({ request }) => {
    const response = await request.get('/api/v1/budgets');
    const body = await response.json() as { budgets: Record<string, unknown>[] };

    const validCategories = ['utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'other'];

    for (const budget of body.budgets) {
      expect(validCategories).toContain(budget.category);

      // monthlyAmount is null (not set) or a positive number
      expect(budget.monthlyAmount === null || typeof budget.monthlyAmount === 'number').toBe(true);
      if (typeof budget.monthlyAmount === 'number') {
        expect(budget.monthlyAmount).toBeGreaterThan(0);
      }

      // spent is always a number >= 0
      expect(typeof budget.spent).toBe('number');
      expect(budget.spent as number).toBeGreaterThanOrEqual(0);

      // rolloverBalance is a number (can be 0 when not set)
      expect(typeof budget.rolloverBalance).toBe('number');

      // effectiveBudget is null when no budget is set, otherwise a positive number
      expect(budget.effectiveBudget === null || typeof budget.effectiveBudget === 'number').toBe(true);

      // remaining is null when no budget is set
      expect(budget.remaining === null || typeof budget.remaining === 'number').toBe(true);

      // status is null when no budget is set, otherwise a string
      expect(budget.status === null || typeof budget.status === 'string').toBe(true);
    }
  });

  test('should return the current month (not a past or far-future month)', async ({ request }) => {
    const response = await request.get('/api/v1/budgets');
    const body = await response.json() as { month: string };

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;
    const expected = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    expect(body.month).toBe(expected);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Budgets API — PUT /api/v1/budgets/[category] (validation)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Budgets API (PUT /api/v1/budgets/:category — validation)', () => {
  test('should return 400 when category is invalid', async ({ request }) => {
    const response = await request.put('/api/v1/budgets/not-a-real-category', {
      data: { monthlyAmount: 200 },
    });

    expect(response.status()).toBe(400);
    const body = await response.json() as { error: string };
    expect(typeof body.error).toBe('string');
    expect(body.error.toLowerCase()).toContain('category');
  });

  test('should return 400 when monthlyAmount is missing', async ({ request }) => {
    const response = await request.put('/api/v1/budgets/utilities', {
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await response.json() as { error: string };
    expect(typeof body.error).toBe('string');
    expect(body.error.toLowerCase()).toContain('monthlyamount');
  });

  test('should return 400 when monthlyAmount is zero or negative', async ({ request }) => {
    const response = await request.put('/api/v1/budgets/utilities', {
      data: { monthlyAmount: 0 },
    });

    expect(response.status()).toBe(400);
    const body = await response.json() as { error: string };
    expect(typeof body.error).toBe('string');
    expect(body.error.toLowerCase()).toContain('monthlyamount');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sync Status API — GET /api/v1/sync/status
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sync Status API (GET /api/v1/sync/status)', () => {
  test('should return HTTP 200', async ({ request }) => {
    const response = await request.get('/api/v1/sync/status');

    expect(response.status()).toBe(200);
  });

  test('should return Content-Type application/json', async ({ request }) => {
    const response = await request.get('/api/v1/sync/status');

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('should return all required top-level fields', async ({ request }) => {
    const response = await request.get('/api/v1/sync/status');
    const body = await response.json() as Record<string, unknown>;

    const requiredFields = [
      'quotaUsed',
      'quotaLimit',
      'quotaGuard',
      'lastSyncAt',
      'lastSyncType',
      'historicalImportDone',
      'nextScheduledSync',
      'simplefinConfigured',
    ];

    for (const field of requiredFields) {
      expect(Object.prototype.hasOwnProperty.call(body, field), `Missing field: ${field}`).toBe(true);
    }
  });

  test('should return quotaUsed as a non-negative integer', async ({ request }) => {
    const response = await request.get('/api/v1/sync/status');
    const body = await response.json() as { quotaUsed: unknown };

    expect(typeof body.quotaUsed).toBe('number');
    expect(Number.isInteger(body.quotaUsed)).toBe(true);
    expect(body.quotaUsed as number).toBeGreaterThanOrEqual(0);
  });

  test('should return quotaLimit as a positive integer', async ({ request }) => {
    const response = await request.get('/api/v1/sync/status');
    const body = await response.json() as { quotaLimit: unknown };

    expect(typeof body.quotaLimit).toBe('number');
    expect(Number.isInteger(body.quotaLimit)).toBe(true);
    expect(body.quotaLimit as number).toBeGreaterThan(0);
  });

  test('should return quotaGuard as a positive integer less than or equal to quotaLimit', async ({ request }) => {
    const response = await request.get('/api/v1/sync/status');
    const body = await response.json() as { quotaGuard: number; quotaLimit: number };

    expect(typeof body.quotaGuard).toBe('number');
    expect(body.quotaGuard).toBeGreaterThan(0);
    expect(body.quotaGuard).toBeLessThanOrEqual(body.quotaLimit);
  });

  test('should return quotaUsed that does not exceed quotaLimit', async ({ request }) => {
    const response = await request.get('/api/v1/sync/status');
    const body = await response.json() as { quotaUsed: number; quotaLimit: number };

    expect(body.quotaUsed).toBeLessThanOrEqual(body.quotaLimit);
  });

  test('should return simplefinConfigured as a boolean', async ({ request }) => {
    const response = await request.get('/api/v1/sync/status');
    const body = await response.json() as { simplefinConfigured: unknown };

    expect(typeof body.simplefinConfigured).toBe('boolean');
  });

  test('should return historicalImportDone as a boolean', async ({ request }) => {
    const response = await request.get('/api/v1/sync/status');
    const body = await response.json() as { historicalImportDone: unknown };

    expect(typeof body.historicalImportDone).toBe('boolean');
  });

  test('should return lastSyncAt as null or a valid ISO date string', async ({ request }) => {
    const response = await request.get('/api/v1/sync/status');
    const body = await response.json() as { lastSyncAt: unknown };

    if (body.lastSyncAt !== null) {
      expect(typeof body.lastSyncAt).toBe('string');
      const parsed = new Date(body.lastSyncAt as string);
      expect(Number.isNaN(parsed.getTime())).toBe(false);
      expect(body.lastSyncAt as string).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    } else {
      expect(body.lastSyncAt).toBeNull();
    }
  });

  test('should return nextScheduledSync as a valid future ISO date string', async ({ request }) => {
    const before = Date.now();
    const response = await request.get('/api/v1/sync/status');
    const body = await response.json() as { nextScheduledSync: unknown };

    if (body.nextScheduledSync !== null) {
      expect(typeof body.nextScheduledSync).toBe('string');
      const parsed = new Date(body.nextScheduledSync as string);
      expect(Number.isNaN(parsed.getTime())).toBe(false);
      // Next scheduled sync should be within the next 48 hours (cron runs daily)
      expect(parsed.getTime()).toBeGreaterThan(before - 1000); // allow 1s margin
      expect(parsed.getTime()).toBeLessThan(before + 49 * 60 * 60 * 1000);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bills API — individual bill routes (PATCH /api/v1/bills/[id], DELETE /api/v1/bills/[id])
// Note: There is no GET /api/v1/bills/[id] route — Next.js returns 405 for unregistered methods.
// Note: DELETE returns 204 for non-existent IDs (StrictDB does not distinguish not-found on delete).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Bills API — individual bill routes', () => {
  test('should return 405 when GET is called on a single-bill route (no GET handler)', async ({ request }) => {
    const response = await request.get('/api/v1/bills/000000000000000000000000');
    expect(response.status()).toBe(405);
  });

  test('should return 404 when patching a bill with a non-existent ID', async ({ request }) => {
    const response = await request.patch('/api/v1/bills/000000000000000000000000', {
      data: { isPaid: true },
    });

    expect(response.status()).toBe(404);
    const body = await response.json() as { error: string };
    expect(typeof body.error).toBe('string');
    expect(body.error.toLowerCase()).toContain('not found');
  });

  test('should return 204 when deleting a non-existent bill (StrictDB does not distinguish not-found)', async ({ request }) => {
    const response = await request.delete('/api/v1/bills/000000000000000000000000');
    // StrictDB deleteOne returns deletedCount:0 for missing docs but the adapter
    // does not surface this as a 404 — idempotent 204 is the actual behavior.
    expect(response.status()).toBe(204);
  });
});
