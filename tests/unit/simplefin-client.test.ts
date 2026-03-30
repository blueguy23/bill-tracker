import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleFINClient } from '@/lib/simplefin/client';

const BASE_URL = 'https://user:token@bridge.simplefin.org/simplefin';

function makeRawResponse(overrides: Record<string, unknown> = {}) {
  return {
    accounts: [{
      id: 'acc-1',
      org: { name: 'Chase' },
      name: 'Checking ...1234',
      currency: 'USD',
      balance: '1000.00',
      'balance-date': 1743200000,
      transactions: [],
    }],
    errors: [],
    ...overrides,
  };
}

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('SimpleFINClient', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  describe('constructor / config', () => {
    it('should throw if SIMPLEFIN_URL is not set', () => {
      expect(() => new SimpleFINClient({ url: undefined })).toThrow('SIMPLEFIN_URL is required');
    });

    it('should accept a valid SIMPLEFIN_URL', () => {
      expect(() => new SimpleFINClient({ url: BASE_URL })).not.toThrow();
    });
  });

  describe('fetchAccounts', () => {
    it('should call GET /accounts with version=2 and start-date', async () => {
      const fetchMock = mockFetch(makeRawResponse());
      vi.stubGlobal('fetch', fetchMock);
      const client = new SimpleFINClient({ url: BASE_URL });
      const startDate = new Date('2026-03-01T00:00:00.000Z');
      await client.fetchAccounts({ startDate });
      const calledUrl = fetchMock.mock.calls[0]![0] as string;
      expect(calledUrl).toContain('version=2');
      expect(calledUrl).toContain(`start-date=${Math.floor(startDate.getTime() / 1000)}`);
      expect(calledUrl).toContain('/accounts');
    });

    it('should call with balances-only=1 when option is set', async () => {
      const fetchMock = mockFetch(makeRawResponse());
      vi.stubGlobal('fetch', fetchMock);
      const client = new SimpleFINClient({ url: BASE_URL });
      await client.fetchAccounts({ balancesOnly: true });
      const calledUrl = fetchMock.mock.calls[0]![0] as string;
      expect(calledUrl).toContain('balances-only=1');
      expect(calledUrl).not.toContain('start-date');
    });

    it('should return accounts and errors from v2 response', async () => {
      vi.stubGlobal('fetch', mockFetch(makeRawResponse()));
      const client = new SimpleFINClient({ url: BASE_URL });
      const result = await client.fetchAccounts({});
      expect(result.accounts).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should identify RATE_LIMIT errors from v2 error objects', async () => {
      const body = makeRawResponse({ accounts: [], errors: [{ type: 'RATE_LIMIT', 'account-id': 'abc' }] });
      vi.stubGlobal('fetch', mockFetch(body));
      const client = new SimpleFINClient({ url: BASE_URL });
      const result = await client.fetchAccounts({});
      expect(result.errors[0]!.type).toBe('RATE_LIMIT');
      expect(result.errors[0]!.accountId).toBe('abc');
    });

    it('should identify NO_DATA errors (re-auth needed)', async () => {
      const body = makeRawResponse({ accounts: [], errors: [{ type: 'NO_DATA', 'account-id': 'xyz' }] });
      vi.stubGlobal('fetch', mockFetch(body));
      const client = new SimpleFINClient({ url: BASE_URL });
      const result = await client.fetchAccounts({});
      expect(result.errors[0]!.type).toBe('NO_DATA');
    });

    it('should throw a network error when fetch itself fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
      const client = new SimpleFINClient({ url: BASE_URL });
      await expect(client.fetchAccounts({})).rejects.toThrow('SimpleFIN network error');
    });

    it('should throw when SimpleFIN returns a non-200 HTTP status', async () => {
      vi.stubGlobal('fetch', mockFetch({}, 401));
      const client = new SimpleFINClient({ url: BASE_URL });
      await expect(client.fetchAccounts({})).rejects.toThrow('HTTP 401');
    });
  });
});
