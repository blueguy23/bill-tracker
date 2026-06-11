import { test, expect } from '@playwright/test';

async function openSidebarIfMobile(page: import('@playwright/test').Page) {
  const menuBtn = page.getByLabel('Open menu');
  if (await menuBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await menuBtn.click();
    await page.locator('aside nav').waitFor({ state: 'visible' });
  }
}

async function hasDashboardData(page: import('@playwright/test').Page): Promise<boolean> {
  return !(await page.getByText('Connect your bank').isVisible({ timeout: 1000 }).catch(() => false));
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Page — /
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dashboard Page (/)', () => {
  test.describe('page structure', () => {
    test('should load at / and render a greeting heading', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveURL('/');
      await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible();
    });

    test('should set the correct document title', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveTitle('Folio');
    });

    test('should render the three KPI tiles', async ({ page }) => {
      await page.goto('/?view=monthly');
      test.skip(!(await hasDashboardData(page)), 'no account data in test DB');

      await expect(page.getByText('Net Cash Flow').first()).toBeVisible();
      await expect(page.getByText('Bills Covered').first()).toBeVisible();
      await expect(page.getByText('Savings Rate').first()).toBeVisible();
    });

    test('should render KPI tile values as USD currency strings or percentages', async ({ page }) => {
      await page.goto('/?view=monthly');
      test.skip(!(await hasDashboardData(page)), 'no account data in test DB');

      const dollarTexts = page.getByText(/\$[\d,]+/).all();
      expect((await dollarTexts).length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar Navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sidebar Navigation', () => {
  test('should display the Folio brand name', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('aside').first()).toBeVisible();
    await expect(page.locator('aside').first().locator('text=Folio').first()).toBeVisible();
  });

  test('should render all navigation links', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('aside nav');
    await expect(nav.locator('a', { hasText: 'Dashboard' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Transactions' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Bills & Payments' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Budget' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Settings' })).toBeVisible();
  });

  test('should render Settings link pointing to /settings', async ({ page }) => {
    await page.goto('/');

    const settingsLink = page.locator('aside nav a', { hasText: 'Settings' });
    await expect(settingsLink).toBeVisible();
    await expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  test('should mark Dashboard link as active on /', async ({ page }) => {
    await page.goto('/');

    const dashboardLink = page.locator('aside nav a', { hasText: 'Dashboard' });
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute('aria-current', 'page');
  });

  test('should navigate to /payments when Payments link is clicked', async ({ page }) => {
    await page.goto('/');
    await openSidebarIfMobile(page);

    await page.locator('aside nav a', { hasText: 'Bills & Payments' }).click();

    await expect(page).toHaveURL('/payments');
    await expect(page.locator('h1')).toContainText('Payments');
  });

  test('should navigate to /budget when Budget & Goals link is clicked', async ({ page }) => {
    await page.goto('/');
    await openSidebarIfMobile(page);

    await page.locator('aside nav a', { hasText: 'Budget' }).click();

    await expect(page).toHaveURL('/budget');
    await expect(page.locator('h1').first()).toContainText('Budget');
  });

  test('should navigate to /transactions when Transactions link is clicked', async ({ page }) => {
    await page.goto('/');
    await openSidebarIfMobile(page);

    await page.locator('aside nav a', { hasText: 'Transactions' }).click();

    await expect(page).toHaveURL('/transactions');
    await expect(page.locator('h1')).toContainText('Transactions');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spending by Category
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Spending by Category', () => {
  test('should render the spending by category section', async ({ page }) => {
    await page.goto('/?view=monthly');
    test.skip(!(await hasDashboardData(page)), 'no account data in test DB');

    await expect(page.getByText('Spending by Category')).toBeVisible();
  });

  test('should show current month as subtitle or empty state', async ({ page }) => {
    await page.goto('/?view=monthly');
    test.skip(!(await hasDashboardData(page)), 'no account data in test DB');

    const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const hasData = await page.getByText(month).isVisible().catch(() => false);
    const hasEmpty = await page.getByText('No spending data yet').isVisible().catch(() => false);
    expect(hasData || hasEmpty).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bottom row — Upcoming Bills + Recent Transactions
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Bottom row panels', () => {
  test('should render an Upcoming Bills panel', async ({ page }) => {
    await page.goto('/?view=monthly');
    test.skip(!(await hasDashboardData(page)), 'no account data in test DB');

    await expect(page.getByText('Upcoming Bills').first()).toBeVisible();
    await expect(page.getByText('Next 14 days').first()).toBeVisible();
  });

  test('should render a Recent Transactions panel with All link', async ({ page }) => {
    await page.goto('/?view=monthly');
    test.skip(!(await hasDashboardData(page)), 'no account data in test DB');

    await expect(page.getByText('Recent Activity')).toBeVisible();
    await expect(page.getByRole('link', { name: 'All →' })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Health API — smoke test
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Health API (/api/v1/health)', () => {
  test('should return 200 with status ok and a valid ISO timestamp', async ({ request }) => {
    const response = await request.get('/api/v1/health');

    expect(response.status()).toBe(200);

    const body = await response.json() as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp).getTime()).toBeGreaterThan(0);
  });

  test('should return a timestamp within the last 10 seconds', async ({ request }) => {
    const before = Date.now();
    const response = await request.get('/api/v1/health');
    const after = Date.now();

    const body = await response.json() as { status: string; timestamp: string };
    const ts = new Date(body.timestamp).getTime();

    expect(ts).toBeGreaterThanOrEqual(before - 5000);
    expect(ts).toBeLessThanOrEqual(after + 1000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding Status API
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Onboarding Status API (/api/v1/onboarding)', () => {
  test('returns 200 with expected shape', async ({ request }) => {
    const res = await request.get('/api/v1/onboarding');
    expect(res.status()).toBe(200);

    const body = await res.json() as {
      simplefinConfigured: boolean;
      accountCount: number;
      billCount: number;
      hasBudget: boolean;
      currentStep: number;
    };
    expect(typeof body.simplefinConfigured).toBe('boolean');
    expect(typeof body.accountCount).toBe('number');
    expect(typeof body.billCount).toBe('number');
    expect(typeof body.hasBudget).toBe('boolean');
    expect([1, 2, 3, 4, 5]).toContain(body.currentStep);
  });

  test('currentStep is at least 2 when SimpleFIN is configured', async ({ request }) => {
    const res = await request.get('/api/v1/onboarding');
    const body = await res.json() as { simplefinConfigured: boolean; currentStep: number };
    if (body.simplefinConfigured) {
      expect(body.currentStep).toBeGreaterThanOrEqual(2);
    }
  });
});
