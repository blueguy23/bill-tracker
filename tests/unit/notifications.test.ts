import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { StrictDB } from 'strictdb';

// ── DB mock ───────────────────────────────────────────────────────────────────

function makeDb(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}): StrictDB {
  return {
    queryOne: vi.fn().mockResolvedValue(null),
    queryMany: vi.fn().mockResolvedValue([]),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'new-id' }),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    ...overrides,
  } as unknown as StrictDB;
}

// ── webhook.ts ────────────────────────────────────────────────────────────────

describe('isWebhookConfigured', () => {
  afterEach(() => { delete process.env.DISCORD_WEBHOOK_URL; });

  it('returns false when env var is missing', async () => {
    delete process.env.DISCORD_WEBHOOK_URL;
    const { isWebhookConfigured } = await import('@/lib/discord/webhook');
    expect(isWebhookConfigured()).toBe(false);
  });

  it('returns true when env var is set', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
    const { isWebhookConfigured } = await import('@/lib/discord/webhook');
    expect(isWebhookConfigured()).toBe(true);
  });
});

describe('sendWebhook', () => {
  beforeEach(() => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });
  afterEach(() => {
    delete process.env.DISCORD_WEBHOOK_URL;
    vi.unstubAllGlobals();
  });

  it('calls fetch with POST and the webhook URL', async () => {
    const { sendWebhook } = await import('@/lib/discord/webhook');
    await sendWebhook({ embeds: [] });
    expect(fetch).toHaveBeenCalledWith(
      'https://discord.com/api/webhooks/test',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws DiscordWebhookError on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    const { sendWebhook, DiscordWebhookError } = await import('@/lib/discord/webhook');
    await expect(sendWebhook({ embeds: [] })).rejects.toBeInstanceOf(DiscordWebhookError);
  });
});

// ── notificationLog adapter ───────────────────────────────────────────────────

describe('findRecentLog', () => {
  it('returns null when no log exists', async () => {
    const db = makeDb({ queryMany: vi.fn().mockResolvedValue([]) });
    const { findRecentLog } = await import('@/adapters/notificationLog');
    const result = await findRecentLog(db, 'some-key', 3600_000);
    expect(result).toBeNull();
  });

  it('returns the log when within cooldown', async () => {
    const recentLog = { _id: 'log-1', key: 'bill_due_soon:b1', event: 'bill_due_soon', sentAt: new Date(), payload: '{}' };
    const db = makeDb({ queryMany: vi.fn().mockResolvedValue([recentLog]) });
    const { findRecentLog } = await import('@/adapters/notificationLog');
    const result = await findRecentLog(db, 'bill_due_soon:b1', 3600_000);
    expect(result).not.toBeNull();
    expect(result?._id).toBe('log-1');
  });
});

describe('insertNotificationLog', () => {
  it('calls db.insertOne with correct shape including a generated _id', async () => {
    const db = makeDb();
    const { insertNotificationLog } = await import('@/adapters/notificationLog');
    const entry = { event: 'test' as const, key: 'test:123', sentAt: new Date(), payload: '{}' };
    const result = await insertNotificationLog(db, entry);

    expect(db.insertOne).toHaveBeenCalled();
    expect(result._id).toBeTruthy();
    expect(result.event).toBe('test');
  });
});

// ── notifications handler ─────────────────────────────────────────────────────

describe('notification handler — early returns', () => {
  afterEach(() => {
    delete process.env.DISCORD_WEBHOOK_URL;
    vi.unstubAllGlobals();
  });

  it('notifyBillDueSoon returns early when webhook not configured', async () => {
    delete process.env.DISCORD_WEBHOOK_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { notifyBillDueSoon } = await import('@/handlers/notifications');
    const db = makeDb();
    await notifyBillDueSoon(db, { billId: 'b1', billName: 'Rent', amount: 1200, dueDate: new Date(), daysUntilDue: 2 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('notifyBillDueSoon skips send when within cooldown', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const recentLog = { _id: 'log-1', key: 'bill_due_soon:b1', event: 'bill_due_soon', sentAt: new Date(), payload: '{}' };
    const db = makeDb({ queryMany: vi.fn().mockResolvedValue([recentLog]) });

    const { notifyBillDueSoon } = await import('@/handlers/notifications');
    await notifyBillDueSoon(db, { billId: 'b1', billName: 'Rent', amount: 1200, dueDate: new Date(), daysUntilDue: 2 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends webhook and inserts log when outside cooldown', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const db = makeDb({ queryMany: vi.fn().mockResolvedValue([]) });
    const { notifyBillDueSoon } = await import('@/handlers/notifications');
    await notifyBillDueSoon(db, { billId: 'b2', billName: 'Internet', amount: 80, dueDate: new Date(), daysUntilDue: 1 });

    expect(fetchMock).toHaveBeenCalled();
    expect(db.insertOne).toHaveBeenCalled();
  });

  it('swallows errors and does not throw', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const db = makeDb({ queryMany: vi.fn().mockResolvedValue([]) });
    const { notifyBillDueSoon } = await import('@/handlers/notifications');
    await expect(
      notifyBillDueSoon(db, { billId: 'b3', billName: 'Gas', amount: 60, dueDate: new Date(), daysUntilDue: 3 }),
    ).resolves.toBeUndefined();
  });
});

// ── digest handler ────────────────────────────────────────────────────────────

describe('runDailyDigest', () => {
  afterEach(() => {
    delete process.env.DISCORD_WEBHOOK_URL;
    vi.unstubAllGlobals();
  });

  it('returns { sent: false, reason: "no_webhook" } when not configured', async () => {
    delete process.env.DISCORD_WEBHOOK_URL;
    const db = makeDb();
    const { runDailyDigest } = await import('@/handlers/notificationDigest');
    const result = await runDailyDigest(db);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe('no_webhook');
  });

  it('returns { sent: false, reason: "already_sent_today" } when within 20h', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
    const recentLog = { _id: 'log-1', key: 'daily_digest:global', event: 'daily_digest', sentAt: new Date(), payload: '{}' };
    const db = makeDb({ queryMany: vi.fn().mockResolvedValue([recentLog]) });
    const { runDailyDigest } = await import('@/handlers/notificationDigest');
    const result = await runDailyDigest(db);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe('already_sent_today');
  });

  it('sends webhook and returns sent:true when conditions met', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const db = makeDb({ queryMany: vi.fn().mockResolvedValue([]) });
    const { runDailyDigest } = await import('@/handlers/notificationDigest');
    const result = await runDailyDigest(db);
    expect(result.sent).toBe(true);
    expect(fetch).toHaveBeenCalled();
  });
});
