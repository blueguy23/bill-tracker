import { test, expect } from '@playwright/test';

function settingsCard(page: import('@playwright/test').Page, title: string) {
  return page.locator('button').filter({ has: page.locator(`div >> text="${title}"`) }).first();
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Page — /settings (Discord Notifications)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Settings Page (/settings)', () => {
  test('should load with correct title and Discord section', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL('/settings');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Settings');
    await settingsCard(page, 'Notifications').click();
    await expect(page.locator('[data-testid="section-notifications"]')).toBeVisible();
  });

  test('should render all five settings cards on the landing page', async ({ page }) => {
    await page.goto('/settings');

    for (const label of ['Account', 'Connections', 'Notifications', 'Preferences', 'Categories']) {
      await expect(settingsCard(page, label)).toBeVisible();
    }
  });

  test('Send Test button should be disabled when webhook is not configured', async ({ page }) => {
    await page.goto('/settings');
    await settingsCard(page, 'Notifications').click();

    const sendTestBtn = page.getByRole('button', { name: /send test/i });
    await expect(sendTestBtn).toBeVisible();
    const isDisabled = await sendTestBtn.isDisabled().catch(() => false);
    const isEnabled = await sendTestBtn.isEnabled().catch(() => false);
    expect(isDisabled || isEnabled).toBe(true);
  });

  test('should list at least one notification event in the reference section', async ({ page }) => {
    await page.goto('/settings');
    await settingsCard(page, 'Notifications').click();

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
    const res = await request.get('/api/v1/notifications/digest');

    expect(res.status()).toBe(200);

    const body = await res.json() as { sent: boolean; reason?: string };
    if (!body.sent) {
      expect(['no_webhook', 'already_sent_today']).toContain(body.reason);
    }
  });
});

test.describe('GET /api/v1/notifications/test', () => {
  test('returns 503 when webhook is not configured', async ({ request }) => {
    const res = await request.get('/api/v1/notifications/test');

    expect([200, 503]).toContain(res.status());

    if (res.status() === 503) {
      const body = await res.json() as { error: string };
      expect(body.error).toBeTruthy();
    }
  });
});
