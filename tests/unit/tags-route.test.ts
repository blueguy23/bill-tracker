/**
 * Unit tests for PATCH /api/v1/transactions/[id]/tags route.
 *
 * Tests the security hardening additions:
 * - 100-character per-tag cap (boundary: 99 / 100 / 101)
 * - Maximum 10 tags per transaction
 * - Array-of-strings type enforcement
 *
 * getDb() and setTransactionTags() are mocked to keep tests pure.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/adapters/db', () => ({
  getDb: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/adapters/transactionTags', () => ({
  setTransactionTags: vi.fn().mockResolvedValue(true),
  setTransactionNotes: vi.fn().mockResolvedValue(true),
}));

const { PATCH } = await import('@/app/api/v1/transactions/[id]/tags/route');

function makeRequest(body: unknown, id = 'txn-abc123'): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/v1/transactions/${id}/tags`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ id }) }];
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/v1/transactions/[id]/tags — per-tag length boundary', () => {
  it('accepts a tag that is exactly 100 characters', async () => {
    const tags = ['a'.repeat(100)];
    const res = await PATCH(...makeRequest({ tags }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
  });

  it('accepts a tag that is 99 characters', async () => {
    const tags = ['a'.repeat(99)];
    const res = await PATCH(...makeRequest({ tags }));
    expect(res.status).toBe(200);
  });

  it('rejects a tag that is 101 characters with 400', async () => {
    const tags = ['a'.repeat(101)];
    const res = await PATCH(...makeRequest({ tags }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/100 characters or fewer/i);
  });

  it('rejects when only ONE tag in the array exceeds 100 chars', async () => {
    const tags = ['groceries', 'a'.repeat(101), 'travel'];
    const res = await PATCH(...makeRequest({ tags }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/100 characters or fewer/i);
  });

  it('accepts multiple tags all exactly at the 100-char limit', async () => {
    const tags = ['a'.repeat(100), 'b'.repeat(100), 'c'.repeat(100)];
    const res = await PATCH(...makeRequest({ tags }));
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/v1/transactions/[id]/tags — maximum tag count', () => {
  it('accepts exactly 10 tags', async () => {
    const tags = Array.from({ length: 10 }, (_, i) => `tag-${i}`);
    const res = await PATCH(...makeRequest({ tags }));
    expect(res.status).toBe(200);
  });

  it('rejects 11 tags with 400', async () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag-${i}`);
    const res = await PATCH(...makeRequest({ tags }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/maximum 10 tags/i);
  });

  it('rejects 100 tags with 400', async () => {
    const tags = Array.from({ length: 100 }, (_, i) => `tag-${i}`);
    const res = await PATCH(...makeRequest({ tags }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/maximum 10 tags/i);
  });

  it('accepts an empty array (clears all tags)', async () => {
    const res = await PATCH(...makeRequest({ tags: [] }));
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/v1/transactions/[id]/tags — type validation', () => {
  it('rejects tags that is a string instead of array with 400', async () => {
    const res = await PATCH(...makeRequest({ tags: 'groceries' }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/array of strings/i);
  });

  it('rejects tags that is null with 400', async () => {
    const res = await PATCH(...makeRequest({ tags: null }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/array of strings/i);
  });

  it('rejects an array containing a number with 400', async () => {
    const res = await PATCH(...makeRequest({ tags: ['groceries', 42] }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/array of strings/i);
  });

  it('rejects an array containing null with 400', async () => {
    const res = await PATCH(...makeRequest({ tags: ['groceries', null] }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/array of strings/i);
  });

  it('rejects an array containing an object with 400', async () => {
    const res = await PATCH(...makeRequest({ tags: [{ name: 'groceries' }] }));
    expect(res.status).toBe(400);
  });

  it('rejects missing tags field with 400', async () => {
    const res = await PATCH(...makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/array of strings/i);
  });
});

describe('PATCH /api/v1/transactions/[id]/tags — 404 when transaction not found', () => {
  it('returns 404 when setTransactionTags returns false', async () => {
    const { setTransactionTags } = await import('@/adapters/transactionTags');
    vi.mocked(setTransactionTags).mockResolvedValueOnce(false);

    const res = await PATCH(...makeRequest({ tags: ['grocery'] }, 'nonexistent-id'));
    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/not found/i);
  });
});

describe('PATCH /api/v1/transactions/[id]/tags — response shape', () => {
  it('echoes back id and tags in response', async () => {
    const tags = ['groceries', 'weekly'];
    const res = await PATCH(...makeRequest({ tags }, 'txn-xyz'));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.id).toBe('txn-xyz');
    expect(body.tags).toEqual(['groceries', 'weekly']);
  });
});

describe('PATCH /api/v1/transactions/[id]/tags — malformed body', () => {
  it('returns 400 for non-JSON body', async () => {
    const req = new NextRequest('http://localhost/api/v1/transactions/txn-1/tags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json',
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'txn-1' }) });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/invalid json/i);
  });
});
