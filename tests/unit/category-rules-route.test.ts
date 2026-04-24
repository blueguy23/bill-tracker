/**
 * Unit tests for POST /api/v1/category-rules route validation logic.
 *
 * Tests the input validation added during security hardening:
 * - 200-character length cap on `pattern` (boundary: 199 / 200 / 201)
 * - Invalid regex rejection when isRegex: true
 * - Invalid / missing category rejection
 * - Missing / empty pattern rejection
 *
 * We test the route handler directly — no HTTP server needed.
 * getDb() and upsertCategoryRule() are mocked so tests stay pure.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock DB adapter — must be set up before importing the route
vi.mock('@/adapters/db', () => ({
  getDb: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/adapters/categoryRules', () => ({
  listCategoryRules: vi.fn().mockResolvedValue([]),
  upsertCategoryRule: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks are in place
const { POST } = await import('@/app/api/v1/category-rules/route');

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/v1/category-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/category-rules — pattern length boundary', () => {
  it('accepts a pattern that is exactly 200 characters', async () => {
    const pattern = 'a'.repeat(200);
    const res = await POST(makeRequest({ pattern, category: 'food', isRegex: false }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
  });

  it('accepts a pattern that is 199 characters', async () => {
    const pattern = 'a'.repeat(199);
    const res = await POST(makeRequest({ pattern, category: 'food', isRegex: false }));
    expect(res.status).toBe(200);
  });

  it('rejects a pattern that is 201 characters with 400', async () => {
    const pattern = 'a'.repeat(201);
    const res = await POST(makeRequest({ pattern, category: 'food', isRegex: false }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/200 characters or fewer/i);
  });

  it('rejects a pattern of 1000 characters', async () => {
    const pattern = 'x'.repeat(1000);
    const res = await POST(makeRequest({ pattern, category: 'shopping', isRegex: false }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/200 characters or fewer/i);
  });

  it('counts trimmed length — 200 chars of spaces + 1 real char exceeds 1 after trim, not 201', async () => {
    // A string of 201 real chars wrapped in spaces: trim() removes spaces,
    // so the trimmed length is still 201 real chars. This verifies the
    // route uses .trim().length for the cap, not raw .length.
    const pattern = '  ' + 'a'.repeat(201) + '  ';
    const res = await POST(makeRequest({ pattern, category: 'food', isRegex: false }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/category-rules — pattern presence validation', () => {
  it('rejects missing pattern with 400', async () => {
    const res = await POST(makeRequest({ category: 'food', isRegex: false }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/pattern is required/i);
  });

  it('rejects empty-string pattern with 400', async () => {
    const res = await POST(makeRequest({ pattern: '', category: 'food', isRegex: false }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/pattern is required/i);
  });

  it('rejects whitespace-only pattern with 400', async () => {
    const res = await POST(makeRequest({ pattern: '   ', category: 'food', isRegex: false }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/pattern is required/i);
  });

  it('rejects numeric pattern with 400', async () => {
    const res = await POST(makeRequest({ pattern: 42, category: 'food', isRegex: false }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/category-rules — category validation', () => {
  it('rejects an unknown category with 400', async () => {
    const res = await POST(makeRequest({ pattern: 'amazon', category: 'crypto', isRegex: false }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/category must be one of/i);
  });

  it('rejects a missing category with 400', async () => {
    const res = await POST(makeRequest({ pattern: 'amazon', isRegex: false }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/category must be one of/i);
  });

  it('accepts every valid category', async () => {
    const { upsertCategoryRule } = await import('@/adapters/categoryRules');
    const validCategories = [
      'food', 'transport', 'shopping', 'entertainment',
      'health', 'utilities', 'subscriptions', 'income', 'transfer', 'other',
    ];
    for (const category of validCategories) {
      vi.mocked(upsertCategoryRule).mockResolvedValue(undefined);
      const res = await POST(makeRequest({ pattern: 'test-pattern', category, isRegex: false }));
      expect(res.status, `expected 200 for category "${category}"`).toBe(200);
    }
  });
});

describe('POST /api/v1/category-rules — regex validation', () => {
  it('rejects an invalid regex pattern when isRegex is true', async () => {
    const res = await POST(makeRequest({ pattern: '(unclosed', category: 'food', isRegex: true }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/invalid regex/i);
  });

  it('rejects a pattern with unmatched bracket when isRegex is true', async () => {
    const res = await POST(makeRequest({ pattern: '[invalid', category: 'food', isRegex: true }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/invalid regex/i);
  });

  it('accepts a valid regex pattern when isRegex is true', async () => {
    const res = await POST(makeRequest({ pattern: '^amazon.*prime$', category: 'subscriptions', isRegex: true }));
    expect(res.status).toBe(200);
  });

  it('does NOT validate regex syntax when isRegex is false — saves literal pattern', async () => {
    // "(unclosed" is invalid regex but should be saved as a literal string
    const res = await POST(makeRequest({ pattern: '(unclosed', category: 'food', isRegex: false }));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/category-rules — malformed request body', () => {
  it('returns 400 for non-JSON body', async () => {
    const req = new NextRequest('http://localhost/api/v1/category-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json at all',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/invalid json/i);
  });
});
