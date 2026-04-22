import { test, expect } from '@playwright/test';

test.describe('Category Rules — Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('[data-testid="category-rules"]')).toBeVisible();
  });

  test('renders category rules section with add form', async ({ page }) => {
    await expect(page.locator('[data-testid="rule-pattern-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="rule-category-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-rule-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="rule-regex-toggle"]')).toBeVisible();
  });

  test('add rule button is disabled when pattern is empty', async ({ page }) => {
    await expect(page.locator('[data-testid="add-rule-btn"]')).toBeDisabled();
  });

  test('add rule button enables when pattern is typed', async ({ page }) => {
    await page.locator('[data-testid="rule-pattern-input"]').fill('test pattern');
    await expect(page.locator('[data-testid="add-rule-btn"]')).toBeEnabled();
  });

  test('can add a keyword rule and see it in the list', async ({ page }) => {
    const pattern = `e2e-test-${Date.now()}`;
    await page.locator('[data-testid="rule-pattern-input"]').fill(pattern);
    await page.locator('[data-testid="rule-category-select"]').selectOption('food');
    await page.locator('[data-testid="add-rule-btn"]').click();

    await expect(page.locator('[data-testid="rules-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="rules-list"]')).toContainText(pattern);
    await expect(page.locator('[data-testid="rules-list"]')).toContainText('Food & Dining');
  });

  test('can delete a rule', async ({ page }) => {
    // Add a rule first
    const pattern = `e2e-delete-${Date.now()}`;
    await page.locator('[data-testid="rule-pattern-input"]').fill(pattern);
    await page.locator('[data-testid="add-rule-btn"]').click();
    await expect(page.locator('[data-testid="rules-list"]')).toContainText(pattern);

    // Hover the row to reveal delete button and click it
    const row = page.locator('[data-testid="rules-list"] > div').filter({ hasText: pattern });
    await row.hover();
    await row.locator('button[aria-label="Delete rule"]').click();

    await expect(page.locator('[data-testid="rules-list"]')).not.toContainText(pattern);
  });

  test('regex toggle changes placeholder text', async ({ page }) => {
    const input = page.locator('[data-testid="rule-pattern-input"]');
    await expect(input).toHaveAttribute('placeholder', /e\.g\. amazon prime/);
    await page.locator('[data-testid="rule-regex-toggle"]').check();
    await expect(input).toHaveAttribute('placeholder', /e\.g\. \^AMZN/);
  });
});
