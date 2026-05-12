import { test, expect } from '@playwright/test';

test.describe('GET /api/v1/user-profile', () => {
  test('returns 200 with expected profile shape', async ({ request }) => {
    const res = await request.get('/api/v1/user-profile');
    expect(res.status()).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body._id).toBe('singleton');
    expect(typeof body.displayName).toBe('string');
    expect(typeof body.ownerName).toBe('string');
    expect(typeof body.currency).toBe('string');
    expect(typeof body.timezone).toBe('string');
    if (body.theme !== undefined) expect(['dark', 'light', 'auto']).toContain(body.theme);
    if (body.defaultDateRange !== undefined) expect(['7d', '30d', '90d', '1y']).toContain(body.defaultDateRange);
    if (body.hideTransfers !== undefined) expect(typeof body.hideTransfers).toBe('boolean');
    if (body.compactRows !== undefined) expect(typeof body.compactRows).toBe('boolean');
    if (body.numberFormat !== undefined) expect(['en-US', 'en-GB', 'de-DE']).toContain(body.numberFormat);
  });

  test('payday is null or a valid day number', async ({ request }) => {
    const res = await request.get('/api/v1/user-profile');
    const body = await res.json() as { payday: number | null };

    if (body.payday !== null) {
      expect(body.payday).toBeGreaterThanOrEqual(1);
      expect(body.payday).toBeLessThanOrEqual(31);
    }
  });
});

test.describe('PATCH /api/v1/user-profile', () => {
  test('rejects invalid payday', async ({ request }) => {
    const res = await request.patch('/api/v1/user-profile', {
      data: { payday: 32 },
    });
    expect(res.status()).toBe(400);

    const body = await res.json() as { error: string };
    expect(body.error).toContain('payday');
  });

  test('updates displayName and returns updated profile', async ({ request }) => {
    const original = await (await request.get('/api/v1/user-profile')).json() as { displayName: string };

    const res = await request.patch('/api/v1/user-profile', {
      data: { displayName: 'E2E Test User' },
    });
    expect(res.status()).toBe(200);

    const body = await res.json() as { displayName: string; _id: string };
    expect(body._id).toBe('singleton');
    expect(body.displayName).toBe('E2E Test User');

    await request.patch('/api/v1/user-profile', {
      data: { displayName: original.displayName },
    });
  });
});
