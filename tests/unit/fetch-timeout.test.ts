/**
 * Unit tests for the AbortController 10-second timeout added to:
 * - SimpleFINClient.fetchAccounts()     (src/lib/simplefin/client.ts)
 * - enrichTransaction()                 (src/adapters/trove.ts)
 * - sendWebhook()                       (src/lib/discord/webhook.ts)
 *
 * Strategy: mock fetch to return a Promise that never resolves, but
 * capture the AbortSignal that was passed to it. We then verify that
 * the signal fires (aborted becomes true) within the timeout window,
 * and that the callers handle the abort correctly.
 *
 * We use vi.useFakeTimers() to advance time without actually waiting.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleFINClient } from '@/lib/simplefin/client';
import { enrichTransaction } from '@/adapters/trove';
import { sendWebhook, DiscordWebhookError } from '@/lib/discord/webhook';

const BASE_URL = 'https://user:token@bridge.simplefin.org/simplefin';

// A fetch mock that hangs forever, but captures the signal
function makeHangingFetch(captureSignal?: (s: AbortSignal) => void) {
  return vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
    if (captureSignal && options?.signal) {
      captureSignal(options.signal as AbortSignal);
    }
    // Never resolves
    return new Promise<Response>(() => {});
  });
}

// A fetch mock that resolves immediately after the signal is aborted
// (simulates real browser/Node behaviour where fetch rejects with AbortError)
function makeAbortAwareFetch() {
  return vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = options?.signal as AbortSignal | undefined;
      if (signal) {
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      }
    });
  });
}

describe('SimpleFINClient — 10-second fetch timeout', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('passes an AbortSignal to fetch', async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', makeHangingFetch((s) => { capturedSignal = s; }));

    const client = new SimpleFINClient({ url: BASE_URL });
    // Start the call but don't await — we just need fetch to be called
    const promise = client.fetchAccounts({});
    // Let microtasks run so fetch is invoked
    await Promise.resolve();

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal!.aborted).toBe(false);

    // Advance past the 10-second timeout
    vi.advanceTimersByTime(10_001);
    await Promise.resolve();

    expect(capturedSignal!.aborted).toBe(true);
    // Suppress unhandled rejection from the hanging promise
    promise.catch(() => {});
  });

  it('throws a network error when fetch is aborted by the timeout', async () => {
    vi.stubGlobal('fetch', makeAbortAwareFetch());

    const client = new SimpleFINClient({ url: BASE_URL });
    const promise = client.fetchAccounts({});

    await Promise.resolve();
    vi.advanceTimersByTime(10_001);
    await Promise.resolve();

    await expect(promise).rejects.toThrow('SimpleFIN network error');
  });

  it('clears the timeout when fetch resolves quickly (no timer leak)', async () => {
    // Resolves immediately — the timer should be cleared before it fires
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ accounts: [], errors: [] }),
    }));

    const client = new SimpleFINClient({ url: BASE_URL });
    await client.fetchAccounts({});

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

describe('enrichTransaction (Trove) — 10-second fetch timeout', () => {
  const originalKey = process.env['TROVE_API_KEY'];

  beforeEach(() => {
    vi.useFakeTimers();
    process.env['TROVE_API_KEY'] = 'test-key-abc';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalKey === undefined) {
      delete process.env['TROVE_API_KEY'];
    } else {
      process.env['TROVE_API_KEY'] = originalKey;
    }
  });

  it('passes an AbortSignal to fetch', async () => {
    let capturedSignal: AbortSignal | undefined;
    // Must be abort-aware so enrichTransaction's catch block can return null
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
      capturedSignal = options?.signal as AbortSignal | undefined;
      return new Promise<Response>((_resolve, reject) => {
        capturedSignal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    }));

    const promise = enrichTransaction('Amazon Prime', -14.99, '2026-04-01', 'user-1');
    await Promise.resolve();

    expect(capturedSignal).toBeDefined();

    vi.advanceTimersByTime(10_001);
    await Promise.resolve();

    expect(capturedSignal!.aborted).toBe(true);
    // enrichTransaction returns null on error — the promise should resolve, not reject
    await expect(promise).resolves.toBeNull();
  });

  it('returns null (does not throw) when request times out', async () => {
    vi.stubGlobal('fetch', makeAbortAwareFetch());

    const promise = enrichTransaction('Whole Foods', -67.42, '2026-04-02', 'user-1');
    await Promise.resolve();
    vi.advanceTimersByTime(10_001);
    await Promise.resolve();

    await expect(promise).resolves.toBeNull();
  });

  it('skips fetch entirely when TROVE_API_KEY is not set', async () => {
    delete process.env['TROVE_API_KEY'];
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await enrichTransaction('Amazon', -14.99, '2026-04-01', 'user-1');

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips fetch when amount is zero', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await enrichTransaction('Amazon', 0, '2026-04-01', 'user-1');

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends absolute value of negative amounts to the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ name: 'Amazon', domain: 'amazon.com', industry: 'retail', categories: ['shopping'] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await enrichTransaction('Amazon Prime', -14.99, '2026-04-01', 'user-1');

    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as Record<string, unknown>;
    expect(sentBody.amount).toBe(14.99);
  });

  it('clears the timeout when fetch resolves quickly', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ name: 'Amazon', domain: null, industry: null, categories: [] }),
    }));

    await enrichTransaction('Amazon', -9.99, '2026-04-01', 'user-1');

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

describe('sendWebhook (Discord) — 10-second fetch timeout', () => {
  const originalUrl = process.env['DISCORD_WEBHOOK_URL'];

  beforeEach(() => {
    vi.useFakeTimers();
    process.env['DISCORD_WEBHOOK_URL'] = 'https://discord.com/api/webhooks/123/abc';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalUrl === undefined) {
      delete process.env['DISCORD_WEBHOOK_URL'];
    } else {
      process.env['DISCORD_WEBHOOK_URL'] = originalUrl;
    }
  });

  const testPayload = { embeds: [{ title: 'Test', color: 0x22c55e }] };

  it('passes an AbortSignal to fetch', async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', makeHangingFetch((s) => { capturedSignal = s; }));

    const promise = sendWebhook(testPayload);
    await Promise.resolve();

    expect(capturedSignal).toBeDefined();

    vi.advanceTimersByTime(10_001);
    await Promise.resolve();

    expect(capturedSignal!.aborted).toBe(true);
    promise.catch(() => {});
  });

  it('rejects with an error when the request times out', async () => {
    vi.stubGlobal('fetch', makeAbortAwareFetch());

    const promise = sendWebhook(testPayload);
    await Promise.resolve();
    vi.advanceTimersByTime(10_001);
    await Promise.resolve();

    // AbortError should propagate (sendWebhook does not swallow non-HTTP errors)
    await expect(promise).rejects.toThrow();
  });

  it('throws DiscordWebhookError for non-2xx status codes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    await expect(sendWebhook(testPayload)).rejects.toBeInstanceOf(DiscordWebhookError);
    await expect(sendWebhook(testPayload)).rejects.toMatchObject({ status: 429 });
  });

  it('throws DiscordWebhookError with correct status for 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const err = await sendWebhook(testPayload).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DiscordWebhookError);
    expect((err as DiscordWebhookError).status).toBe(500);
  });

  it('does nothing (no fetch) when DISCORD_WEBHOOK_URL is not set', async () => {
    delete process.env['DISCORD_WEBHOOK_URL'];
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendWebhook(testPayload)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves successfully for a 2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

    await expect(sendWebhook(testPayload)).resolves.toBeUndefined();
  });

  it('clears the timeout when fetch resolves quickly', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

    await sendWebhook(testPayload);

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
