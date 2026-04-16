import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Auth — login page and session protection
// ─────────────────────────────────────────────────────────────────────────────

const PASSWORD = process.env['AUTH_PASSWORD'] ?? 'testpassword';

test.describe('Auth — login page', () => {
  test('unauthenticated visit to / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Bill Tracker');
  });

  test('login page renders password input and submit button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-btn"]')).toContainText('Sign in');
  });

  test('wrong password shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.locator('[data-testid="password-input"]').fill('wrongpassword');
    await page.locator('[data-testid="login-btn"]').click();
    await expect(page).toHaveURL(/\/login\?error=invalid/);
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Incorrect password');
  });

  test('correct password redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('[data-testid="password-input"]').fill(PASSWORD);
    await page.locator('[data-testid="login-btn"]').click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('authenticated visit to /login redirects to /', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.locator('[data-testid="password-input"]').fill(PASSWORD);
    await page.locator('[data-testid="login-btn"]').click();
    await expect(page).toHaveURL('/');

    // Visiting /login again should redirect back to dashboard
    await page.goto('/login');
    await expect(page).toHaveURL('/');
  });
});
