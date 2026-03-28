import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('loads successfully with correct content', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('has correct page title and metadata', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/My App/);
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
  });
});

test.describe('Health API', () => {
  test('returns ok status', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeTruthy();
  });
});
