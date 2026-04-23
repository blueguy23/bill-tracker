import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Page — /
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dashboard Page (/)', () => {
  test.describe('page structure', () => {
    test('should have correct URL and h1 heading', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveURL('/');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    test('should set the correct document title', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveTitle('Folio');
    });

    test('should render all four summary cards', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByText('Owed This Month', { exact: true })).toBeVisible();
      await expect(page.getByText('Paid', { exact: true })).toBeVisible();
      await expect(page.getByText('Overdue', { exact: true })).toBeVisible();
      await expect(page.getByText('AutoPay Total', { exact: true })).toBeVisible();
    });

    test('should render the summary card grid', async ({ page }) => {
      await page.goto('/');

      const cardGrid = page.locator('.grid.grid-cols-2');
      await expect(cardGrid).toBeVisible();
    });
  });

  test.describe('bills section', () => {
    test('should render the Bills section heading', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('h2').filter({ hasText: 'Bills' })).toBeVisible();
    });

    test('should render the Add Bill button', async ({ page }) => {
      await page.goto('/');

      const addBillBtn = page.locator('[data-testid="add-bill-btn"]');
      await expect(addBillBtn).toBeVisible();
      await expect(addBillBtn).toContainText('Add Bill');
      await expect(addBillBtn).toBeEnabled();
    });

    test('should show bill count or bills table', async ({ page }) => {
      await page.goto('/');

      const billsTable = page.locator('[data-testid="bills-table"]');
      const hasTable = await billsTable.isVisible().catch(() => false);

      if (hasTable) {
        await expect(billsTable).toBeVisible();
      } else {
        await expect(page.getByText('NO BILLS')).toBeVisible();
      }
    });

    test('should open Add Bill modal when button is clicked', async ({ page }) => {
      await page.goto('/');

      await page.locator('[data-testid="add-bill-btn"]').click();

      await expect(page.locator('input[name="name"], input[placeholder*="name" i]').first()).toBeVisible();
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

  test('should render core navigation links', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('aside nav');
    await expect(nav.locator('a', { hasText: 'Dashboard' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Transactions' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Recurring Bills' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Budget' })).toBeVisible();
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

  test('should navigate to /recurring when Recurring Bills link is clicked', async ({ page }) => {
    await page.goto('/');

    await page.locator('aside nav a', { hasText: 'Recurring Bills' }).click();

    await expect(page).toHaveURL('/recurring');
    await expect(page.locator('h1')).toContainText('Recurring Bills');
  });

  test('should navigate to /budget when Budget link is clicked', async ({ page }) => {
    await page.goto('/');

    await page.locator('aside nav a', { hasText: 'Budget' }).click();

    await expect(page).toHaveURL('/budget');
    await expect(page.locator('h1')).toContainText('Budget');
  });

  test('should navigate to /transactions when Transactions link is clicked', async ({ page }) => {
    await page.goto('/');

    await page.locator('aside nav a', { hasText: 'Transactions' }).click();

    await expect(page).toHaveURL('/transactions');
    await expect(page.locator('h1')).toContainText('Transactions');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cash Flow Card
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Cash Flow Card', () => {
  test('should render the cash flow card with heading and period label', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('[data-testid="cash-flow-card"]');
    await expect(card).toBeVisible();
    await expect(card.locator('h3')).toContainText('Cash Flow');
    await expect(card.getByText('This month', { exact: true })).toBeVisible();
  });

  test('should show Income, Expenses, and Net labels', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('[data-testid="cash-flow-card"]');
    await expect(card.getByText('Income', { exact: true })).toBeVisible();
    await expect(card.getByText('Expenses', { exact: true })).toBeVisible();
    await expect(card.getByText('Net', { exact: true })).toBeVisible();
  });

  test('should display income as a USD value', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-testid="cash-flow-income"]')).toBeVisible();
    await expect(page.locator('[data-testid="cash-flow-income"]')).toContainText('$');
  });

  test('should display expenses as a USD value', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-testid="cash-flow-expenses"]')).toBeVisible();
    await expect(page.locator('[data-testid="cash-flow-expenses"]')).toContainText('$');
  });

  test('should display net as a USD value', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-testid="cash-flow-net"]')).toBeVisible();
    await expect(page.locator('[data-testid="cash-flow-net"]')).toContainText('$');
  });

  test('should render the income/expense split bar', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-testid="cash-flow-bar"]')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spending Chart
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Spending Chart', () => {
  test('should render the spending chart with heading', async ({ page }) => {
    await page.goto('/');

    const chart = page.locator('[data-testid="spending-chart"]');
    await expect(chart).toBeVisible();
    await expect(chart.locator('h3')).toContainText('Spending by Category');
  });

  test('should show Monthly bills label or empty state', async ({ page }) => {
    await page.goto('/');

    const chart = page.locator('[data-testid="spending-chart"]');
    const subtitle = chart.getByText('Monthly bills', { exact: true });
    const emptyState = chart.getByText('No bill data yet.', { exact: true });
    await expect(subtitle.or(emptyState).first()).toBeVisible();
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
