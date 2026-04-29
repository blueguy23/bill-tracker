import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Page — /
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dashboard Page (/)', () => {
  test.describe('page structure', () => {
    test('should load at / and render a greeting heading', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveURL('/');
      await expect(page.locator('h1')).toBeVisible();
      // Greeting is time-dependent: "Good morning", "Good afternoon", or "Good evening"
      await expect(page.locator('h1')).toContainText('Good');
    });

    test('should set the correct document title', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveTitle('Folio');
    });

    test('should render the three metric cards', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByText('Monthly Net', { exact: true })).toBeVisible();
      await expect(page.getByText('Bills Owed', { exact: true })).toBeVisible();
      await expect(page.getByText('AutoPay', { exact: true })).toBeVisible();
    });

    test('should render metric card values as USD currency strings', async ({ page }) => {
      await page.goto('/');

      // All three MetricCards display monetary values — find at least 3 $ signs
      const dollarTexts = page.getByText(/\$[\d,]+/).all();
      expect((await dollarTexts).length).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('period selector', () => {
    test('should render the period selector buttons', async ({ page }) => {
      await page.goto('/');

      // PeriodSelector renders 1W 1M 3M YTD 1Y as buttons
      await expect(page.getByRole('button', { name: '1M' })).toBeVisible();
      await expect(page.getByRole('button', { name: '3M' })).toBeVisible();
      await expect(page.getByRole('button', { name: '1Y' })).toBeVisible();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar Navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sidebar Navigation', () => {
  test('should display the Folio brand name', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('aside').getByText('Folio', { exact: true })).toBeVisible();
  });

  test('should render all navigation links', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('aside nav');
    await expect(nav.locator('a', { hasText: 'Dashboard' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Transactions' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Payments' })).toBeVisible();
    await expect(nav.locator('a', { hasText: /Budget.*Goals/ })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Credit Health' })).toBeVisible();
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

    await page.locator('aside nav a', { hasText: 'Payments' }).click();

    await expect(page).toHaveURL('/payments');
    await expect(page.locator('h1')).toContainText('Payments');
  });

  test('should navigate to /budget when Budget & Goals link is clicked', async ({ page }) => {
    await page.goto('/');

    await page.locator('aside nav a', { hasText: /Budget.*Goals/ }).click();

    await expect(page).toHaveURL('/budget');
    await expect(page.locator('h1').first()).toContainText('Budget');
  });

  test('should navigate to /transactions when Transactions link is clicked', async ({ page }) => {
    await page.goto('/');

    await page.locator('aside nav a', { hasText: 'Transactions' }).click();

    await expect(page).toHaveURL('/transactions');
    await expect(page.locator('h1')).toContainText('Transactions');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cash Flow Chart Card
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Cash Flow Card', () => {
  test('should render the cash flow card with heading', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('[data-testid="cash-flow-card"]');
    await expect(card).toBeVisible();
    await expect(card.getByText('Cash Flow', { exact: true })).toBeVisible();
  });

  test('should show INCOME, SPEND, and NET legend labels', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('[data-testid="cash-flow-card"]');
    await expect(card.getByText('INCOME', { exact: true })).toBeVisible();
    await expect(card.getByText('SPEND', { exact: true })).toBeVisible();
    await expect(card.getByText('NET', { exact: true })).toBeVisible();
  });

  test('should render the chart area', async ({ page }) => {
    await page.goto('/');

    // The chart area is a canvas element rendered by Chart.js inside the card
    const card = page.locator('[data-testid="cash-flow-card"]');
    await expect(card).toBeVisible();
    // Chart canvas or empty state div must exist within the card
    const chartContent = card.locator('canvas, div[style*="height"]').first();
    await expect(chartContent).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spend by Category Card
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Spending Chart', () => {
  test('should render the spend by category card', async ({ page }) => {
    await page.goto('/');

    const chart = page.locator('[data-testid="spending-chart"]');
    await expect(chart).toBeVisible();
    await expect(chart.getByText('Spend by Category', { exact: true })).toBeVisible();
  });

  test('should show This period subtitle or chart content', async ({ page }) => {
    await page.goto('/');

    const chart = page.locator('[data-testid="spending-chart"]');
    await expect(chart.getByText('This period', { exact: true })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Budget & Recent Panels (bottom row)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Bottom row panels', () => {
  test('should render a Budget panel with a View link', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Budget', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'View →' })).toBeVisible();
  });

  test('should render a Recent transactions panel', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Recent', { exact: true })).toBeVisible();
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
