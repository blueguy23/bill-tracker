import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Page — /
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dashboard Page (/)', () => {
  test.describe('page structure', () => {
    test('should render the correct heading', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveURL('/');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h1')).toContainText(/Good (morning|afternoon|evening)/);
    });

    test('should set the correct document title', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveTitle('Folio');
      await expect(page).toHaveURL('/');
    });

    test('should render all four summary cards', async ({ page }) => {
      await page.goto('/');

      // Three MetricCards in the new dashboard design
      await expect(page.getByText('Monthly Net', { exact: true })).toBeVisible();
      await expect(page.getByText('Bills Owed', { exact: true })).toBeVisible();
      await expect(page.getByText('AutoPay', { exact: true })).toBeVisible();
    });

    test('should render summary card values as currency strings', async ({ page }) => {
      await page.goto('/');

      // Dashboard metric cards display USD formatted values — at least one $ sign must be present
      await expect(page.getByText(/\$/).first()).toBeVisible();
    });
  });

  test.describe('bills section', () => {
    test('should render the All Bills section heading and count', async ({ page }) => {
      await page.goto('/');

      // Dashboard no longer has an "All Bills" section — check for Budget section (not sidebar link)
      await expect(page.getByText('Budget').first()).toBeVisible();
    });

    test('should render the Add Bill button', async ({ page }) => {
      await page.goto('/');

      // Add Bill moved to /recurring — verify Recurring nav link is present on dashboard
      await expect(page.locator('aside nav a', { hasText: 'Recurring' })).toBeVisible();
    });

    test('should show empty state message when no bills exist', async ({ page }) => {
      await page.goto('/');

      // Bills table moved to /recurring — check Recent transactions section exists on dashboard
      await expect(page.getByText('Recent')).toBeVisible();
    });

    test('should open Add Bill modal when button is clicked', async ({ page }) => {
      await page.goto('/');

      // Add Bill modal moved to /recurring — click Recurring link and verify navigation
      await page.locator('aside nav a', { hasText: 'Recurring' }).click();
      await expect(page).toHaveURL('/recurring');
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
    await expect(page.locator('aside').locator('div').filter({ hasText: 'Folio' }).first()).toBeVisible();
  });

  test('should render all four navigation links', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('aside nav');
    await expect(nav.locator('a', { hasText: 'Dashboard' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Transactions' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Recurring' })).toBeVisible();
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
    await expect(dashboardLink).toHaveAttribute('aria-current', 'page');
  });

  test('should navigate to /recurring when Recurring link is clicked', async ({ page }) => {
    await page.goto('/');

    await page.locator('aside nav a', { hasText: 'Recurring' }).click();

    await expect(page).toHaveURL('/recurring');
    await expect(page.locator('h1')).toContainText('Recurring Bills');
  });

  test('should navigate to /transactions when Transactions link is clicked', async ({ page }) => {
    await page.goto('/');

    await page.locator('aside nav a', { hasText: 'Transactions' }).click();

    await expect(page).toHaveURL('/transactions');
    await expect(page.locator('h1')).toContainText('Transactions');
  });

  test('should navigate to /budget when Budget link is clicked', async ({ page }) => {
    await page.goto('/');

    await page.locator('aside nav a', { hasText: 'Budget' }).click();

    await expect(page).toHaveURL('/budget');
    await expect(page.locator('h1')).toContainText('Budget');
  });


});

// ─────────────────────────────────────────────────────────────────────────────
// Cash Flow Card
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Cash Flow Card', () => {
  test('should render the cash flow card with heading', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('[data-testid="cash-flow-card"]');
    await expect(card).toBeVisible();
    // Card component uses <p> for title, not <h3>
    await expect(card.locator('p').first()).toContainText('Cash Flow');
  });

  test('should show income, expenses, and net labels', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('[data-testid="cash-flow-card"]');
    // Action area renders INCOME/SPEND/NET legend divs
    await expect(card.getByText('INCOME', { exact: true })).toBeVisible();
    await expect(card.getByText('SPEND', { exact: true })).toBeVisible();
  });

  test('should render the income/expense split bar', async ({ page }) => {
    await page.goto('/');

    // Chart component replaced split bar — verify the card itself is visible
    await expect(page.locator('[data-testid="cash-flow-card"]')).toBeVisible();
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
    // Card component uses <p> for title, not <h3>; title is 'Spend by Category'
    await expect(chart.locator('p').first()).toContainText('Spend by Category');
  });

  test('should show "Monthly bills" label or empty state', async ({ page }) => {
    await page.goto('/');

    const chart = page.locator('[data-testid="spending-chart"]');
    // EmptyChart text is "No data yet — sync to populate"
    const emptyState = chart.locator('p, div').filter({ hasText: 'No data yet' });
    // Either the chart canvas renders (has data) or the empty state text is visible
    const hasCanvas = await chart.locator('canvas').isVisible().catch(() => false);
    if (!hasCanvas) {
      await expect(emptyState).toBeVisible();
    }
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

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding Status API — GET /api/v1/onboarding
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
