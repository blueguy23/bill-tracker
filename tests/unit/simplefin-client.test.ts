import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SimpleFINClient,
  InvalidTokenError,
  TokenCompromisedError,
  SubscriptionLapsedError,
  AuthFailedError,
} from '@/lib/simplefin/client';

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
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
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

    it('should expose a urlHash derived from the URL', () => {
      const client = new SimpleFINClient({ url: BASE_URL });
      expect(typeof client.urlHash).toBe('string');
      expect(client.urlHash.length).toBe(16);
      // same URL => same hash
      const client2 = new SimpleFINClient({ url: BASE_URL });
      expect(client.urlHash).toBe(client2.urlHash);
    });
  });

  describe('claimToken', () => {
    it('should POST to decoded URL and return access URL on 200', async () => {
      const accessUrl = 'https://user:secret@bridge.simplefin.org/simplefin';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(accessUrl),
      }));

      const client = new SimpleFINClient({ url: BASE_URL });
      const claimUrl = 'https://beta-bridge.simplefin.org/simplefin/claim/abc123';
      const setupToken = Buffer.from(claimUrl).toString('base64');

      const result = await client.claimToken(setupToken);
      expect(result).toBe(accessUrl);

      const fetchMock = vi.mocked(globalThis.fetch);
      expect(fetchMock).toHaveBeenCalledOnce();
      const [calledUrl, calledInit] = fetchMock.mock.calls[0]!;
      expect(calledUrl).toBe(claimUrl);
      expect((calledInit as RequestInit).method).toBe('POST');
    });

    it('should throw TokenCompromisedError on 403', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve(''),
      }));

      const client = new SimpleFINClient({ url: BASE_URL });
      const setupToken = Buffer.from('https://bridge.simplefin.org/claim/xyz').toString('base64');

      await expect(client.claimToken(setupToken)).rejects.toThrow(TokenCompromisedError);
      await expect(client.claimToken(setupToken)).rejects.toThrow('already been used');
    });

    it('should throw InvalidTokenError when decoded URL is HTTP (not HTTPS)', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      const client = new SimpleFINClient({ url: BASE_URL });
      const httpToken = Buffer.from('http://bridge.simplefin.org/claim/insecure').toString('base64');

      await expect(client.claimToken(httpToken)).rejects.toThrow(InvalidTokenError);
      await expect(client.claimToken(httpToken)).rejects.toThrow('HTTPS');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should throw InvalidTokenError when decoded value is not a URL', async () => {
      const client = new SimpleFINClient({ url: BASE_URL });
      const badToken = Buffer.from('not-a-url').toString('base64');

      await expect(client.claimToken(badToken)).rejects.toThrow(InvalidTokenError);
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

    it('should append end-date param when endDate is provided', async () => {
      const fetchMock = mockFetch(makeRawResponse());
      vi.stubGlobal('fetch', fetchMock);
      const client = new SimpleFINClient({ url: BASE_URL });
      const endDate = new Date('2026-04-01T00:00:00.000Z');
      await client.fetchAccounts({ endDate });
      const calledUrl = fetchMock.mock.calls[0]![0] as string;
      expect(calledUrl).toContain(`end-date=${Math.floor(endDate.getTime() / 1000)}`);
    });

    it('should append repeated account= params for accountIds', async () => {
      const fetchMock = mockFetch(makeRawResponse());
      vi.stubGlobal('fetch', fetchMock);
      const client = new SimpleFINClient({ url: BASE_URL });
      await client.fetchAccounts({ accountIds: ['ACT-1', 'ACT-2'] });
      const calledUrl = fetchMock.mock.calls[0]![0] as string;
      expect(calledUrl).toContain('account=ACT-1');
      expect(calledUrl).toContain('account=ACT-2');
    });

    it('should set pending=1 when includePending is true', async () => {
      const fetchMock = mockFetch(makeRawResponse());
      vi.stubGlobal('fetch', fetchMock);
      const client = new SimpleFINClient({ url: BASE_URL });
      await client.fetchAccounts({ includePending: true });
      const calledUrl = fetchMock.mock.calls[0]![0] as string;
      expect(calledUrl).toContain('pending=1');
    });

    it('should not set pending= when includePending is false or omitted', async () => {
      const fetchMock = mockFetch(makeRawResponse());
      vi.stubGlobal('fetch', fetchMock);
      const client = new SimpleFINClient({ url: BASE_URL });
      await client.fetchAccounts({});
      const calledUrl = fetchMock.mock.calls[0]![0] as string;
      expect(calledUrl).not.toContain('pending=');
    });

    it('should return accounts and errors from response', async () => {
      vi.stubGlobal('fetch', mockFetch(makeRawResponse()));
      const client = new SimpleFINClient({ url: BASE_URL });
      const result = await client.fetchAccounts({});
      expect(result.accounts).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should throw SubscriptionLapsedError on 402', async () => {
      vi.stubGlobal('fetch', mockFetch({}, 402));
      const client = new SimpleFINClient({ url: BASE_URL });
      await expect(client.fetchAccounts({})).rejects.toThrow(SubscriptionLapsedError);
      await expect(client.fetchAccounts({})).rejects.toThrow('subscription has expired');
    });

    it('should throw AuthFailedError on 403', async () => {
      vi.stubGlobal('fetch', mockFetch({}, 403));
      const client = new SimpleFINClient({ url: BASE_URL });
      await expect(client.fetchAccounts({})).rejects.toThrow(AuthFailedError);
      await expect(client.fetchAccounts({})).rejects.toThrow('was denied');
    });

    it('should identify RATE_LIMIT errors from error objects', async () => {
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
