import { describe, it, expect } from 'vitest';
import { get } from './helpers';

describe('GET /api/v1/health', () => {
  it('returns 200', async () => {
    const res = await get('/api/v1/health');
    expect(res.status).toBe(200);
  });

  it('returns status "ok"', async () => {
    const res = await get('/api/v1/health');
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('returns a valid ISO 8601 timestamp', async () => {
    const res = await get('/api/v1/health');
    const body = await res.json();

    expect(typeof body.timestamp).toBe('string');
    expect(Number.isNaN(new Date(body.timestamp).getTime())).toBe(false);
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('returns a recent timestamp (within 30s)', async () => {
    const before = Date.now();
    const res = await get('/api/v1/health');
    const after = Date.now();
    const body = await res.json();
    const ts = new Date(body.timestamp).getTime();

    expect(ts).toBeGreaterThanOrEqual(before - 5000);
    expect(ts).toBeLessThanOrEqual(after + 1000);
  });

  it('returns Content-Type application/json', async () => {
    const res = await get('/api/v1/health');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('returns exactly the expected top-level keys', async () => {
    const res = await get('/api/v1/health');
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(['checks', 'responseTimeMs', 'status', 'timestamp', 'uptime']);
  });
});
