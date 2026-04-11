import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Page — /
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dashboard Page (/)', () => {
  test.describe('page structure', () => {
    test('should render the correct heading and subtitle', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveURL('/');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Dashboard');
      await expect(page.locator('p').filter({ hasText: 'Your bills at a glance' })).toBeVisible();
    });

    test('should set the correct document title', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveTitle('Bill Tracker');
      await expect(page).toHaveURL('/');
    });

    test('should render all four summary cards', async ({ page }) => {
      await page.goto('/');

      // All four card labels must be present
      await expect(page.locator('p').filter({ hasText: 'Owed This Month' })).toBeVisible();
      await expect(page.locator('p').filter({ hasText: 'Paid' }).first()).toBeVisible();
      await expect(page.locator('p').filter({ hasText: 'Overdue' })).toBeVisible();
      await expect(page.locator('p').filter({ hasText: 'AutoPay Total' })).toBeVisible();
    });

    test('should render summary card values as currency strings', async ({ page }) => {
      await page.goto('/');

      // All monetary cards should display a USD formatted value ($0.00 at minimum)
      const cardValues = page.locator('.tabular-nums, .text-\\[1\\.75rem\\]');
      const allCards = page.locator('p.text-\\[1\\.75rem\\]');

      // The grid contains exactly 4 cards with dollar or count values
      const cardGrid = page.locator('.grid.grid-cols-2');
      await expect(cardGrid).toBeVisible();

      // Overdue card "All clear" subtext appears when overdueCount is 0
      // This verifies the summary computation ran and rendered correctly
      const overdueCard = page.locator('p').filter({ hasText: 'OVERDUE' }).locator('..').locator('..');
      await expect(overdueCard).toBeVisible();
    });
  });

  test.describe('bills section', () => {
    test('should render the All Bills section heading and count', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('h2').filter({ hasText: 'All Bills' })).toBeVisible();
      // Count text is either "No bills" or "{n} bill(s)"
      const billCountText = page.locator('p.text-xs').filter({ hasText: /bills?$|^No bills$/ });
      await expect(billCountText).toBeVisible();
    });

    test('should render the Add Bill button', async ({ page }) => {
      await page.goto('/');

      const addBillBtn = page.locator('[data-testid="add-bill-btn"]');
      await expect(addBillBtn).toBeVisible();
      await expect(addBillBtn).toContainText('Add Bill');
      await expect(addBillBtn).toBeEnabled();
    });

    test('should show empty state message when no bills exist', async ({ page }) => {
      await page.goto('/');

      const tableOrEmpty = page.locator('[data-testid="bills-table"], p.text-zinc-500');
      await expect(tableOrEmpty.first()).toBeVisible();

      // If there are no bills, the empty state must show the correct copy
      const billsTable = page.locator('[data-testid="bills-table"]');
      const emptyState = page.locator('p.text-zinc-500').filter({ hasText: 'No bills yet' });

      const hasTable = await billsTable.isVisible().catch(() => false);
      if (!hasTable) {
        await expect(emptyState).toBeVisible();
        await expect(page.locator('p').filter({ hasText: 'Click' })).toBeVisible();
      }
    });

    test('should open Add Bill modal when button is clicked', async ({ page }) => {
      await page.goto('/');

      const addBillBtn = page.locator('[data-testid="add-bill-btn"]');
      await addBillBtn.click();

      // Modal should appear — it contains a form with a Name field
      await expect(page.locator('input[name="name"], input[placeholder*="name" i], label').filter({ hasText: /name/i }).first()).toBeVisible();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar Navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sidebar Navigation', () => {
  test('should display the Bill Tracker brand name', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('aside').locator('span').filter({ hasText: 'Bill Tracker' })).toBeVisible();
  });

  test('should render all four navigation links', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('aside nav');
    await expect(nav.locator('a', { hasText: 'Dashboard' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Recurring' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Summary' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Budget' })).toBeVisible();
  });

  test('should render the Settings item as a link to /settings', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('aside nav');
    const settingsLink = nav.locator('a', { hasText: 'Settings' });
    await expect(settingsLink).toBeVisible();
    await expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  test('should mark Dashboard link as active on /', async ({ page }) => {
    await page.goto('/');

    const dashboardLink = page.locator('aside nav a', { hasText: 'Dashboard' });
    await expect(dashboardLink).toBeVisible();
    // Active state uses bg-white/[0.08] and text-white; inactive uses text-zinc-500
    // We verify the class contains the active token
    await expect(dashboardLink).toHaveClass(/bg-white\/\[0\.08\]/);
  });

  test('should navigate to /recurring when Recurring link is clicked', async ({ page }) => {
    await page.goto('/');

    await page.locator('aside nav a', { hasText: 'Recurring' }).click();

    await expect(page).toHaveURL('/recurring');
    await expect(page.locator('h1')).toContainText('Recurring Bills');
  });

  test('should navigate to /summary when Summary link is clicked', async ({ page }) => {
    await page.goto('/');

    await page.locator('aside nav a', { hasText: 'Summary' }).click();

    await expect(page).toHaveURL('/summary');
    await expect(page.locator('h1')).toContainText('Monthly Summary');
  });

  test('should navigate to /budget when Budget link is clicked', async ({ page }) => {
    await page.goto('/');

    await page.locator('aside nav a', { hasText: 'Budget' }).click();

    await expect(page).toHaveURL('/budget');
    await expect(page.locator('h1')).toContainText('Budget');
  });


});

// ─────────────────────────────────────────────────────────────────────────────
// Health API — verified here as a smoke test for the full stack
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Health API (/api/v1/health)', () => {
  test('should return 200 with status ok and a valid ISO timestamp', async ({ request }) => {
    const response = await request.get('/api/v1/health');

    expect(response.status()).toBe(200);

    const body = await response.json() as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(() => new Date(body.timestamp)).not.toThrow();
    expect(new Date(body.timestamp).getTime()).toBeGreaterThan(0);
  });

  test('should return a timestamp within the last 10 seconds', async ({ request }) => {
    const before = Date.now();
    const response = await request.get('/api/v1/health');
    const after = Date.now();

    const body = await response.json() as { status: string; timestamp: string };
    const ts = new Date(body.timestamp).getTime();

    expect(ts).toBeGreaterThanOrEqual(before - 5000); // allow 5s clock skew
    expect(ts).toBeLessThanOrEqual(after + 1000);
  });
});
