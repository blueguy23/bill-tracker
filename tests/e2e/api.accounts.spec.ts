import { test, expect } from '@playwright/test';

test.describe('GET /api/v1/accounts', () => {
  test('returns 200 with expected shape', async ({ request }) => {
    const res = await request.get('/api/v1/accounts');
    expect(res.status()).toBe(200);

    const body = await res.json() as {
      accounts: unknown[];
      transactions: unknown[];
      lastSyncAt: string | null;
      simplefinConfigured: boolean;
    };
    expect(Array.isArray(body.accounts)).toBe(true);
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(typeof body.simplefinConfigured).toBe('boolean');
    expect(body.lastSyncAt === null || typeof body.lastSyncAt === 'string').toBe(true);
  });

  test('account objects have required fields when present', async ({ request }) => {
    const res = await request.get('/api/v1/accounts');
    const body = await res.json() as { accounts: Record<string, unknown>[] };

    if (body.accounts.length > 0) {
      const acct = body.accounts[0]!;
      expect(typeof acct._id).toBe('string');
      expect(typeof acct.balance).toBe('number');
      expect(typeof acct.orgName).toBe('string');
    }
  });
});

test.describe('GET /api/v1/accounts/balances', () => {
  test('returns 200 with accounts array and totalBalance', async ({ request }) => {
    const res = await request.get('/api/v1/accounts/balances');
    expect(res.status()).toBe(200);

    const body = await res.json() as {
      accounts: unknown[];
      totalBalance: number;
    };
    expect(Array.isArray(body.accounts)).toBe(true);
    expect(typeof body.totalBalance).toBe('number');
  });

  test('totalBalance equals sum of individual account balances', async ({ request }) => {
    const res = await request.get('/api/v1/accounts/balances');
    const body = await res.json() as {
      accounts: { balance: number }[];
      totalBalance: number;
    };

    const sum = body.accounts.reduce((s, a) => s + a.balance, 0);
    expect(body.totalBalance).toBeCloseTo(sum, 2);
  });
});
