import { describe, it, expect } from 'vitest';
import { get, patch } from './helpers';

describe('GET /api/v1/user-profile', () => {
  it('returns 200 with expected profile shape', async () => {
    const res = await get('/api/v1/user-profile');
    expect(res.status).toBe(200);

    const body = await res.json();
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

  it('payday is null or a valid day number', async () => {
    const res = await get('/api/v1/user-profile');
    const body = await res.json();

    if (body.payday !== null) {
      expect(body.payday).toBeGreaterThanOrEqual(1);
      expect(body.payday).toBeLessThanOrEqual(31);
    }
  });
});

describe('PATCH /api/v1/user-profile', () => {
  it('rejects invalid payday', async () => {
    const res = await patch('/api/v1/user-profile', { payday: 32 });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('payday');
  });

  it('updates displayName and returns updated profile', async () => {
    const original = await (await get('/api/v1/user-profile')).json();

    const res = await patch('/api/v1/user-profile', { displayName: 'Integration Test User' });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body._id).toBe('singleton');
    expect(body.displayName).toBe('Integration Test User');

    await patch('/api/v1/user-profile', { displayName: original.displayName });
  });
});
