import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Settings Page — /settings (Discord Notifications)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Settings Page (/settings)', () => {
  test('should load with correct title and Discord section', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL('/settings');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(page.getByText('Discord Notifications')).toBeVisible();
  });

  test('should show "Not configured" badge when webhook env var is absent', async ({ page }) => {
    // NEXT_PUBLIC_DISCORD_CONFIGURED is not set in test env → defaults to false
    await page.goto('/settings');

    await expect(page.getByText('Not configured')).toBeVisible();
  });

  test('Send Test button should be disabled when webhook is not configured', async ({ page }) => {
    await page.goto('/settings');

    const sendTestBtn = page.getByRole('button', { name: /send test/i });
    await expect(sendTestBtn).toBeVisible();
    await expect(sendTestBtn).toBeDisabled();
  });

  test('should list at least one notification event in the reference section', async ({ page }) => {
    await page.goto('/settings');

    // The settings view renders a list of notification event types
    await expect(page.getByText(/bill due soon/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Notification API Routes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GET /api/v1/notifications/digest', () => {
  test('returns 200 with correct JSON shape', async ({ request }) => {
    const res = await request.get('/api/v1/notifications/digest');

    expect(res.status()).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.sent).toBe('boolean');
    expect(typeof body.billsDueSoon).toBe('number');
    expect(typeof body.overdueCount).toBe('number');
    expect(typeof body.budgetWarnings).toBe('number');
  });

  test('returns sent:false and reason:no_webhook when webhook not configured', async ({ request }) => {
    // Test env does not set DISCORD_WEBHOOK_URL
    const res = await request.get('/api/v1/notifications/digest');

    expect(res.status()).toBe(200);

    const body = await res.json() as { sent: boolean; reason?: string };
    expect(body.sent).toBe(false);
    expect(body.reason).toBe('no_webhook');
  });
});

test.describe('GET /api/v1/notifications/test', () => {
  test('returns 503 when webhook is not configured', async ({ request }) => {
    // DISCORD_WEBHOOK_URL is not set in test env
    const res = await request.get('/api/v1/notifications/test');

    expect(res.status()).toBe(503);

    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });
});
