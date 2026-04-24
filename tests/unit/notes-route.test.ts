/**
 * Unit tests for PATCH /api/v1/transactions/[id]/notes route.
 *
 * Tests the 2000-character cap and type validation added during security hardening.
 * Boundary values: 1999, 2000, 2001 characters.
 *
 * getDb() and setTransactionNotes() are mocked to keep tests pure.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/adapters/db', () => ({
  getDb: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/adapters/transactionTags', () => ({
  setTransactionNotes: vi.fn().mockResolvedValue(true),
  setTransactionTags: vi.fn().mockResolvedValue(true),
}));

const { PATCH } = await import('@/app/api/v1/transactions/[id]/notes/route');

function makeRequest(body: unknown, id = 'txn-abc123'): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/v1/transactions/${id}/notes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ id }) }];
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/v1/transactions/[id]/notes — notes length boundary', () => {
  it('accepts notes that are exactly 2000 characters', async () => {
    const notes = 'a'.repeat(2000);
    const res = await PATCH(...makeRequest({ notes }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
  });

  it('accepts notes that are 1999 characters', async () => {
    const notes = 'a'.repeat(1999);
    const res = await PATCH(...makeRequest({ notes }));
    expect(res.status).toBe(200);
  });

  it('rejects notes that are 2001 characters with 400', async () => {
    const notes = 'a'.repeat(2001);
    const res = await PATCH(...makeRequest({ notes }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/2000 characters or fewer/i);
  });

  it('rejects notes that are 10000 characters with 400', async () => {
    const notes = 'z'.repeat(10_000);
    const res = await PATCH(...makeRequest({ notes }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/2000 characters or fewer/i);
  });
});

describe('PATCH /api/v1/transactions/[id]/notes — type validation', () => {
  it('accepts null notes (clears the note)', async () => {
    const res = await PATCH(...makeRequest({ notes: null }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.notes).toBeNull();
  });

  it('accepts an empty string (treated as clearing the note)', async () => {
    const res = await PATCH(...makeRequest({ notes: '' }));
    expect(res.status).toBe(200);
  });

  it('accepts a request with no notes key (undefined)', async () => {
    // notes is optional — undefined should be treated as clearing
    const res = await PATCH(...makeRequest({}));
    expect(res.status).toBe(200);
  });

  it('rejects notes that is a number with 400', async () => {
    const res = await PATCH(...makeRequest({ notes: 42 }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/notes must be a string or null/i);
  });

  it('rejects notes that is an array with 400', async () => {
    const res = await PATCH(...makeRequest({ notes: ['line1', 'line2'] }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/notes must be a string or null/i);
  });

  it('rejects notes that is an object with 400', async () => {
    const res = await PATCH(...makeRequest({ notes: { text: 'hello' } }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/notes must be a string or null/i);
  });

  it('rejects notes that is a boolean with 400', async () => {
    const res = await PATCH(...makeRequest({ notes: true }));
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/transactions/[id]/notes — 404 when transaction not found', () => {
  it('returns 404 when setTransactionNotes returns false', async () => {
    const { setTransactionNotes } = await import('@/adapters/transactionTags');
    vi.mocked(setTransactionNotes).mockResolvedValueOnce(false);

    const res = await PATCH(...makeRequest({ notes: 'some note' }, 'nonexistent-id'));
    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/not found/i);
  });
});

describe('PATCH /api/v1/transactions/[id]/notes — response shape', () => {
  it('returns id and notes in the response body', async () => {
    const res = await PATCH(...makeRequest({ notes: 'My important note' }, 'txn-xyz'));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.id).toBe('txn-xyz');
    expect(body.notes).toBe('My important note');
  });

  it('returns null for notes when null is passed', async () => {
    const res = await PATCH(...makeRequest({ notes: null }, 'txn-xyz'));
    const body = await res.json() as Record<string, unknown>;
    expect(body.notes).toBeNull();
  });
});

describe('PATCH /api/v1/transactions/[id]/notes — malformed body', () => {
  it('returns 400 for non-JSON body', async () => {
    const req = new NextRequest('http://localhost/api/v1/transactions/txn-1/notes', {
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
