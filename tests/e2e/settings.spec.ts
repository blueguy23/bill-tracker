import { test, expect } from '@playwright/test';

function settingsCard(page: import('@playwright/test').Page, title: string) {
  return page.locator('button').filter({ has: page.locator(`div >> text="${title}"`) }).first();
}

test.describe('Settings Page (/settings)', () => {
  test.describe('landing page', () => {
    test('renders heading and subtitle', async ({ page }) => {
      await page.goto('/settings');

      await expect(page.locator('h1')).toContainText('Settings');
      await expect(page.getByText('Account, connections, and preferences')).toBeVisible();
    });

    test('renders all five section cards', async ({ page }) => {
      await page.goto('/settings');

      for (const label of ['Account', 'Connections', 'Notifications', 'Preferences', 'Categories']) {
        await expect(settingsCard(page, label)).toBeVisible();
      }
    });

    test('renders the account hero with display name', async ({ page }) => {
      await page.goto('/settings');

      const profileRes = await page.request.get('/api/v1/user-profile');
      const profile = await profileRes.json() as { displayName: string };

      await expect(page.getByText(profile.displayName)).toBeVisible();
    });
  });

  test.describe('modal behavior', () => {
    test('clicking Account card opens account modal', async ({ page }) => {
      await page.goto('/settings');

      await settingsCard(page, 'Account').click();
      await expect(page.locator('[data-testid="section-account"]')).toBeVisible();
      await expect(page.locator('[data-testid="display-name-input"]')).toBeVisible();
    });

    test('clicking Connections card opens connections modal', async ({ page }) => {
      await page.goto('/settings');

      await settingsCard(page, 'Connections').click();
      await expect(page.locator('[data-testid="section-connections"]')).toBeVisible();
    });

    test('clicking Preferences card opens preferences modal', async ({ page }) => {
      await page.goto('/settings');

      await settingsCard(page, 'Preferences').click();
      await expect(page.locator('[data-testid="section-preferences"]')).toBeVisible();
    });

    test('modal can be closed with Escape', async ({ page }) => {
      await page.goto('/settings');

      await settingsCard(page, 'Account').click();
      await expect(page.locator('[data-testid="section-account"]')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="section-account"]')).not.toBeVisible();
    });
  });
});
