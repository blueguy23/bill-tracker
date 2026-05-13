import { describe, it, expect } from 'vitest';
import { get } from './helpers';

describe('GET /api/v1/accounts', () => {
  it('returns 200 with expected shape', async () => {
    const res = await get('/api/v1/accounts');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.accounts)).toBe(true);
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(typeof body.simplefinConfigured).toBe('boolean');
    expect(body.lastSyncAt === null || typeof body.lastSyncAt === 'string').toBe(true);
  });

  it('account objects have required fields when present', async () => {
    const res = await get('/api/v1/accounts');
    const body = await res.json();

    if (body.accounts.length > 0) {
      const acct = body.accounts[0];
      expect(typeof acct._id).toBe('string');
      expect(typeof acct.balance).toBe('number');
      expect(typeof acct.orgName).toBe('string');
    }
  });
});

describe('GET /api/v1/accounts/balances', () => {
  it('returns 200 with accounts array and totalBalance', async () => {
    const res = await get('/api/v1/accounts/balances');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.accounts)).toBe(true);
    expect(typeof body.totalBalance).toBe('number');
  });

  it('totalBalance equals sum of individual account balances', async () => {
    const res = await get('/api/v1/accounts/balances');
    const body = await res.json();

    const sum = body.accounts.reduce((s: number, a: { balance: number }) => s + a.balance, 0);
    expect(body.totalBalance).toBeCloseTo(sum, 2);
  });
});
