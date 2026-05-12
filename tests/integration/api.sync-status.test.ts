import { describe, it, expect } from 'vitest';
import { get } from './helpers';

describe('GET /api/v1/sync/status', () => {
  it('returns 200', async () => {
    const res = await get('/api/v1/sync/status');
    expect(res.status).toBe(200);
  });

  it('returns Content-Type application/json', async () => {
    const res = await get('/api/v1/sync/status');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('returns all required top-level fields', async () => {
    const res = await get('/api/v1/sync/status');
    const body = await res.json();

    const requiredFields = [
      'quotaUsed', 'quotaLimit', 'quotaGuard', 'lastSyncAt',
      'lastSyncType', 'historicalImportDone', 'nextScheduledSync', 'simplefinConfigured',
    ];
    for (const field of requiredFields) {
      expect(Object.prototype.hasOwnProperty.call(body, field), `Missing field: ${field}`).toBe(true);
    }
  });

  it('quotaUsed is a non-negative integer', async () => {
    const res = await get('/api/v1/sync/status');
    const body = await res.json();

    expect(typeof body.quotaUsed).toBe('number');
    expect(Number.isInteger(body.quotaUsed)).toBe(true);
    expect(body.quotaUsed).toBeGreaterThanOrEqual(0);
  });

  it('quotaLimit is a positive integer', async () => {
    const res = await get('/api/v1/sync/status');
    const body = await res.json();

    expect(typeof body.quotaLimit).toBe('number');
    expect(Number.isInteger(body.quotaLimit)).toBe(true);
    expect(body.quotaLimit).toBeGreaterThan(0);
  });

  it('quotaGuard is positive and <= quotaLimit', async () => {
    const res = await get('/api/v1/sync/status');
    const body = await res.json();

    expect(typeof body.quotaGuard).toBe('number');
    expect(body.quotaGuard).toBeGreaterThan(0);
    expect(body.quotaGuard).toBeLessThanOrEqual(body.quotaLimit);
  });

  it('quotaUsed does not exceed quotaLimit', async () => {
    const res = await get('/api/v1/sync/status');
    const body = await res.json();
    expect(body.quotaUsed).toBeLessThanOrEqual(body.quotaLimit);
  });

  it('simplefinConfigured is a boolean', async () => {
    const res = await get('/api/v1/sync/status');
    const body = await res.json();
    expect(typeof body.simplefinConfigured).toBe('boolean');
  });

  it('historicalImportDone is a boolean', async () => {
    const res = await get('/api/v1/sync/status');
    const body = await res.json();
    expect(typeof body.historicalImportDone).toBe('boolean');
  });

  it('lastSyncAt is null or a valid ISO date', async () => {
    const res = await get('/api/v1/sync/status');
    const body = await res.json();

    if (body.lastSyncAt !== null) {
      expect(typeof body.lastSyncAt).toBe('string');
      expect(Number.isNaN(new Date(body.lastSyncAt).getTime())).toBe(false);
      expect(body.lastSyncAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    } else {
      expect(body.lastSyncAt).toBeNull();
    }
  });

  it('nextScheduledSync is null or a valid future ISO date', async () => {
    const before = Date.now();
    const res = await get('/api/v1/sync/status');
    const body = await res.json();

    if (body.nextScheduledSync !== null) {
      expect(typeof body.nextScheduledSync).toBe('string');
      const parsed = new Date(body.nextScheduledSync);
      expect(Number.isNaN(parsed.getTime())).toBe(false);
      expect(parsed.getTime()).toBeGreaterThan(before - 1000);
      expect(parsed.getTime()).toBeLessThan(before + 49 * 60 * 60 * 1000);
    }
  });
});
