/**
 * Unit tests for the search route's regex escaping behavior.
 *
 * The security fix replaced an in-memory 5000-row scan with a DB-level $regex
 * filter. The user-supplied query string is escaped with:
 *
 *   q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
 *
 * These tests verify that every regex meta-character is neutralized,
 * preventing ReDoS (catastrophic backtracking) and injection attacks.
 *
 * Strategy: call the GET handler with a mocked DB queryMany that captures
 * whatever filter object the route builds, then assert the `description.$regex`
 * value contains the expected escape sequences.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Capture the filter passed to queryMany so we can inspect regex escaping
const mockQueryMany = vi.fn().mockResolvedValue([]);

vi.mock('@/adapters/db', () => ({
  getDb: vi.fn().mockResolvedValue({
    queryMany: mockQueryMany,
  }),
}));

const { GET } = await import('@/app/api/v1/transactions/search/route');

function makeRequest(q: string, limit?: number): NextRequest {
  const url = new URL('http://localhost/api/v1/transactions/search');
  url.searchParams.set('q', q);
  if (limit !== undefined) url.searchParams.set('limit', String(limit));
  return new NextRequest(url.toString());
}

// Helper: extract the $regex value from the captured queryMany call
function getCapturedRegex(): string {
  const call = mockQueryMany.mock.calls[0];
  if (!call) throw new Error('queryMany was not called');
  const filter = call[1] as { description?: { $regex?: string } };
  if (!filter.description?.$regex) throw new Error('No $regex in filter');
  return filter.description.$regex;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/transactions/search — minimum query length guard', () => {
  it('returns empty array and does NOT query DB when q is 1 character', async () => {
    const res = await GET(makeRequest('a'));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.transactions).toEqual([]);
    expect(mockQueryMany).not.toHaveBeenCalled();
  });

  it('returns empty array and does NOT query DB when q is empty string', async () => {
    const res = await GET(makeRequest(''));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.transactions).toEqual([]);
    expect(mockQueryMany).not.toHaveBeenCalled();
  });

  it('queries DB when q is exactly 2 characters', async () => {
    await GET(makeRequest('ab'));
    expect(mockQueryMany).toHaveBeenCalledOnce();
  });
});

describe('GET /api/v1/transactions/search — regex meta-character escaping', () => {
  it('escapes a literal dot so it does not match any character', async () => {
    await GET(makeRequest('a.b'));
    const regex = getCapturedRegex();
    expect(regex).toBe('a\\.b');
    expect(regex).not.toBe('a.b');
  });

  it('escapes asterisk to prevent unlimited quantifier injection', async () => {
    await GET(makeRequest('ab*cd'));
    const regex = getCapturedRegex();
    expect(regex).toContain('\\*');
  });

  it('escapes plus sign', async () => {
    await GET(makeRequest('ab+cd'));
    const regex = getCapturedRegex();
    expect(regex).toContain('\\+');
  });

  it('escapes question mark', async () => {
    await GET(makeRequest('ab?cd'));
    const regex = getCapturedRegex();
    expect(regex).toContain('\\?');
  });

  it('escapes caret', async () => {
    await GET(makeRequest('^start'));
    const regex = getCapturedRegex();
    expect(regex).toContain('\\^');
  });

  it('escapes dollar sign', async () => {
    await GET(makeRequest('end$'));
    const regex = getCapturedRegex();
    expect(regex).toContain('\\$');
  });

  it('escapes opening curly brace', async () => {
    await GET(makeRequest('a{3}'));
    const regex = getCapturedRegex();
    expect(regex).toContain('\\{');
  });

  it('escapes opening parenthesis', async () => {
    await GET(makeRequest('(group)'));
    const regex = getCapturedRegex();
    expect(regex).toContain('\\(');
    expect(regex).toContain('\\)');
  });

  it('escapes pipe character (alternation operator)', async () => {
    await GET(makeRequest('amazon|netflix'));
    const regex = getCapturedRegex();
    expect(regex).toContain('\\|');
  });

  it('escapes opening square bracket', async () => {
    await GET(makeRequest('[abc]'));
    const regex = getCapturedRegex();
    expect(regex).toContain('\\[');
  });

  it('escapes backslash itself', async () => {
    await GET(makeRequest('path\\file'));
    const regex = getCapturedRegex();
    // The backslash should be escaped to \\
    expect(regex).toContain('\\\\');
  });

  it('escapes a ReDoS-triggering catastrophic backtracking pattern', async () => {
    // Classic ReDoS: (a+)+ against a long string of a's followed by non-matching char
    const malicious = '(a+)+';
    await GET(makeRequest(malicious));
    const regex = getCapturedRegex();
    expect(regex).toBe('\\(a\\+\\)\\+');
    // Verify the escaped regex is safe to compile
    expect(() => new RegExp(regex)).not.toThrow();
  });

  it('preserves plain alphanumeric search terms unchanged', async () => {
    await GET(makeRequest('Netflix'));
    const regex = getCapturedRegex();
    expect(regex).toBe('Netflix');
  });

  it('preserves spaces in search terms unchanged', async () => {
    await GET(makeRequest('whole foods'));
    const regex = getCapturedRegex();
    expect(regex).toBe('whole foods');
  });

  it('handles a search term containing all meta-characters at once', async () => {
    const allMeta = '.*+?^${}()|[\\]';
    await GET(makeRequest(allMeta));
    const regex = getCapturedRegex();
    // The result must be a valid (compilable) regex
    expect(() => new RegExp(regex)).not.toThrow();
    // None of the raw meta-characters should appear unescaped
    // (we verify by checking the escaped form is present for each)
    expect(regex).toContain('\\.');
    expect(regex).toContain('\\*');
    expect(regex).toContain('\\+');
    expect(regex).toContain('\\?');
    expect(regex).toContain('\\^');
    expect(regex).toContain('\\$');
  });
});

describe('GET /api/v1/transactions/search — limit parameter', () => {
  it('defaults limit to 10 when not specified', async () => {
    await GET(makeRequest('amazon'));
    const call = mockQueryMany.mock.calls[0]!;
    const options = call[2] as { limit?: number };
    expect(options.limit).toBe(10);
  });

  it('caps limit at 50 even when a larger value is requested', async () => {
    await GET(makeRequest('amazon', 999));
    const call = mockQueryMany.mock.calls[0]!;
    const options = call[2] as { limit?: number };
    expect(options.limit).toBe(50);
  });

  it('accepts limit of exactly 50', async () => {
    await GET(makeRequest('amazon', 50));
    const call = mockQueryMany.mock.calls[0]!;
    const options = call[2] as { limit?: number };
    expect(options.limit).toBe(50);
  });

  it('accepts limit of 1', async () => {
    await GET(makeRequest('amazon', 1));
    const call = mockQueryMany.mock.calls[0]!;
    const options = call[2] as { limit?: number };
    expect(options.limit).toBe(1);
  });
});

describe('GET /api/v1/transactions/search — response shape', () => {
  it('returns only the allowed fields from matched transactions', async () => {
    mockQueryMany.mockResolvedValueOnce([{
      _id: 'txn-1',
      description: 'Amazon Prime',
      amount: -14.99,
      posted: 1743200000,
      // These fields should NOT appear in the response
      pending: false,
      tags: ['subscriptions'],
      notes: 'secret note',
    }]);

    const res = await GET(makeRequest('Amazon'));
    const body = await res.json() as { transactions: Record<string, unknown>[] };
    expect(body.transactions).toHaveLength(1);
    const txn = body.transactions[0]!;
    expect(txn).toHaveProperty('_id', 'txn-1');
    expect(txn).toHaveProperty('description', 'Amazon Prime');
    expect(txn).toHaveProperty('amount', -14.99);
    expect(txn).toHaveProperty('posted');
    // Sensitive / extra fields must be stripped
    expect(txn).not.toHaveProperty('tags');
    expect(txn).not.toHaveProperty('notes');
    expect(txn).not.toHaveProperty('pending');
  });

  it('returns an empty transactions array when no matches found', async () => {
    mockQueryMany.mockResolvedValueOnce([]);
    const res = await GET(makeRequest('xyznonexistent'));
    const body = await res.json() as { transactions: unknown[] };
    expect(body.transactions).toEqual([]);
  });
});
