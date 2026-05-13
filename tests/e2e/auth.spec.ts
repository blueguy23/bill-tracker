import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Auth — login page and session protection
// ─────────────────────────────────────────────────────────────────────────────

const PASSWORD = process.env['AUTH_PASSWORD'] ?? 'testpassword';

async function submitLogin(page: import('@playwright/test').Page, password: string) {
  await page.locator('[data-testid="login-btn"]').waitFor({ state: 'visible' });
  await page.locator('[data-testid="password-input"]').fill(password);
  await page.locator('[data-testid="login-btn"]').click();
}

test.describe('Auth — login page', () => {
  // Server Actions under Turbopack fail with "Failed to fetch" on sustained multi-browser load.
  // Auth logic is browser-agnostic — restrict to desktop chromium to match CI config.
  test.beforeEach(({ }, testInfo) => {
    if (testInfo.project.name !== 'chromium') testInfo.skip();
  });
  test.describe.configure({ retries: 2 });
  test.use({ storageState: { cookies: [], origins: [] } });

  test('unauthenticated visit to / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Folio');
  });

  test('login page renders password input and submit button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-btn"]')).toContainText('Sign in');
  });

  test('wrong password shows error message', async ({ page }) => {
    await page.goto('/login');
    await submitLogin(page, 'wrongpassword');
    await expect(page).toHaveURL(/\/login\?error=invalid/);
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Incorrect password');
  });

  test('correct password redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await submitLogin(page, PASSWORD);
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText(/Good (morning|afternoon|evening)/);
  });

  test('authenticated visit to /login redirects to /', async ({ page }) => {
    await page.goto('/login');
    await submitLogin(page, PASSWORD);
    await expect(page).toHaveURL('/');

    // Visiting /login again should redirect back to dashboard
    await page.goto('/login');
    await expect(page).toHaveURL('/');
  });
});
