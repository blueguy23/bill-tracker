import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions Page (/subscriptions)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Subscriptions Page (/subscriptions)', () => {
  test('should load with correct title', async ({ page }) => {
    await page.goto('/subscriptions');

    await expect(page).toHaveURL('/subscriptions');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Subscriptions');
  });

  test('should render a subtitle', async ({ page }) => {
    await page.goto('/subscriptions');

    const subtitle = page.locator('p').filter({ hasText: /pattern|detected|recurring/i }).first();
    await expect(subtitle).toBeVisible();
  });

  test('should show Subscriptions link in sidebar', async ({ page }) => {
    await page.goto('/subscriptions');

    const nav = page.locator('aside nav');
    const link = nav.locator('a', { hasText: 'Subscriptions' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/subscriptions');
  });

  test('should mark Subscriptions link as active when on /subscriptions', async ({ page }) => {
    await page.goto('/subscriptions');

    const nav = page.locator('aside nav');
    const link = nav.locator('a', { hasText: 'Subscriptions' });
    await expect(link).toHaveAttribute('aria-current', 'page');
  });

  test('should render empty state or subscription cards', async ({ page }) => {
    await page.goto('/subscriptions');

    const hasCards = await page.locator('[class*="rounded-xl"]').count() > 0;
    expect(hasCards).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions API
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GET /api/v1/subscriptions', () => {
  test('returns 200', async ({ request }) => {
    const res = await request.get('/api/v1/subscriptions');
    expect(res.status()).toBe(200);
  });

  test('returns a subscriptions array', async ({ request }) => {
    const res = await request.get('/api/v1/subscriptions');
    const body = await res.json() as Record<string, unknown>;
    expect(Array.isArray(body.subscriptions)).toBe(true);
  });

  test('each item has required fields', async ({ request }) => {
    const res = await request.get('/api/v1/subscriptions');
    const body = await res.json() as { subscriptions: Record<string, unknown>[] };
    for (const item of body.subscriptions) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.normalizedName).toBe('string');
      expect(typeof item.amount).toBe('number');
      expect(typeof item.interval).toBe('string');
      expect(typeof item.confidence).toBe('string');
      expect(typeof item.lastCharged).toBe('string');
      expect(typeof item.nextEstimated).toBe('string');
      expect(typeof item.occurrences).toBe('number');
      expect(typeof item.suggestedCategory).toBe('string');
    }
  });
});

test.describe('POST /api/v1/subscriptions/dismiss', () => {
  test('returns 200 for a nonexistent id (idempotent)', async ({ request }) => {
    const res = await request.post('/api/v1/subscriptions/dismiss', {
      data: { id: 'nonexistent-id-12345' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { dismissed: boolean };
    expect(body.dismissed).toBe(true);
  });

  test('returns 400 when body is missing', async ({ request }) => {
    const res = await request.post('/api/v1/subscriptions/dismiss', {
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
  });
});

test.describe('GET /api/v1/subscriptions/matches', () => {
  test('returns 200 with matches array', async ({ request }) => {
    const res = await request.get('/api/v1/subscriptions/matches');
    expect(res.status()).toBe(200);
    const body = await res.json() as { matches: unknown[] };
    expect(Array.isArray(body.matches)).toBe(true);
  });
});
