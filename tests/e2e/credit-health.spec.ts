import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Credit Summary API — GET /api/v1/credit/summary
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Credit Summary API (GET /api/v1/credit/summary)', () => {
  test('should return HTTP 200', async ({ request }) => {
    const response = await request.get('/api/v1/credit/summary');
    expect(response.status()).toBe(200);
  });

  test('should return Content-Type application/json', async ({ request }) => {
    const response = await request.get('/api/v1/credit/summary');
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('should return all required top-level fields', async ({ request }) => {
    const response = await request.get('/api/v1/credit/summary');
    const body = await response.json() as Record<string, unknown>;

    expect(Array.isArray(body.accounts)).toBe(true);
    expect(typeof body.overall).toBe('object');
    expect(Array.isArray(body.recentPayments)).toBe(true);
    expect(body.score === null || typeof body.score === 'number').toBe(true);
  });

  test('should return overall stats with correct numeric fields', async ({ request }) => {
    const response = await request.get('/api/v1/credit/summary');
    const body = await response.json() as {
      overall: {
        totalBalance: unknown;
        totalLimit: unknown;
        utilization: unknown;
        accountCount: unknown;
        accountsWithLimitData: unknown;
      };
    };

    const o = body.overall;
    expect(typeof o.totalBalance).toBe('number');
    expect(typeof o.totalLimit).toBe('number');
    expect(typeof o.accountCount).toBe('number');
    expect(o.accountCount as number).toBeGreaterThanOrEqual(0);
    expect(typeof o.accountsWithLimitData).toBe('number');
    expect(o.utilization === null || typeof o.utilization === 'number').toBe(true);
  });

  test('should return account objects with required fields when accounts exist', async ({ request }) => {
    const response = await request.get('/api/v1/credit/summary');
    const body = await response.json() as { accounts: Array<Record<string, unknown>> };

    for (const account of body.accounts) {
      expect(typeof account.id).toBe('string');
      expect(typeof account.orgName).toBe('string');
      expect(typeof account.name).toBe('string');
      expect(typeof account.balance).toBe('number');
      expect(typeof account.hasLimitData).toBe('boolean');
      expect(typeof account.balanceDate).toBe('string');
      expect(Number.isNaN(new Date(account.balanceDate as string).getTime())).toBe(false);
    }
  });

  test('should return recentPayments with required fields when payments exist', async ({ request }) => {
    const response = await request.get('/api/v1/credit/summary');
    const body = await response.json() as { recentPayments: Array<Record<string, unknown>> };

    for (const payment of body.recentPayments) {
      expect(typeof payment.id).toBe('string');
      expect(typeof payment.accountId).toBe('string');
      expect(typeof payment.accountName).toBe('string');
      expect(typeof payment.orgName).toBe('string');
      expect(typeof payment.amount).toBe('number');
      expect(typeof payment.description).toBe('string');
      expect(typeof payment.posted).toBe('string');
      expect(Number.isNaN(new Date(payment.posted as string).getTime())).toBe(false);
    }
  });

  test('should return score between 0 and 100 when accounts exist', async ({ request }) => {
    const response = await request.get('/api/v1/credit/summary');
    const body = await response.json() as { score: number | null; overall: { accountCount: number } };

    if (body.overall.accountCount > 0 && body.score !== null) {
      expect(body.score).toBeGreaterThanOrEqual(0);
      expect(body.score).toBeLessThanOrEqual(100);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Credit Advisor API — GET /api/v1/credit/advisor
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Credit Advisor API (GET /api/v1/credit/advisor)', () => {
  test('should return HTTP 200', async ({ request }) => {
    const response = await request.get('/api/v1/credit/advisor');
    expect(response.status()).toBe(200);
  });

  test('should return Content-Type application/json', async ({ request }) => {
    const response = await request.get('/api/v1/credit/advisor');
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('should return trend array and nullable azeo object', async ({ request }) => {
    const response = await request.get('/api/v1/credit/advisor');
    const body = await response.json() as Record<string, unknown>;

    expect(Array.isArray(body.trend)).toBe(true);
    expect(body.azeo === null || typeof body.azeo === 'object').toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sync API — POST /api/v1/sync
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sync API (POST /api/v1/sync)', () => {
  test('should return 200, 429, or 503 depending on SimpleFIN config', async ({ request }) => {
    const response = await request.post('/api/v1/sync');
    expect([200, 429, 503]).toContain(response.status());

    const body = await response.json() as Record<string, unknown>;
    if (response.status() === 200) {
      expect(body.synced).toBe(true);
      expect(typeof body.accountsUpdated).toBe('number');
      expect(typeof body.transactionsUpserted).toBe('number');
      expect(body.transactionsUpserted as number).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(body.warnings)).toBe(true);
    }
  });

  test('should return 503 with simplefin error message when not configured', async ({ request }) => {
    const response = await request.post('/api/v1/sync');
    if (response.status() === 503) {
      const body = await response.json() as { error: string };
      expect(typeof body.error).toBe('string');
      expect(body.error.toLowerCase()).toContain('simplefin');
    }
  });

  test('should return quotaUsed as a non-negative integer on success', async ({ request }) => {
    const response = await request.post('/api/v1/sync');
    if (response.status() === 200) {
      const body = await response.json() as { quotaUsed: unknown };
      expect(typeof body.quotaUsed).toBe('number');
      expect(body.quotaUsed as number).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Credit Health Page — /credit (UI)
// Design reference: design/credit-health (1).html
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Credit Health Page (/credit)', () => {

  // ── helpers ──────────────────────────────────────────────────────────────
  async function hasAccounts(page: import('@playwright/test').Page): Promise<boolean> {
    return page.locator('[data-testid="verdict-card"]').isVisible().catch(() => false);
  }

  // ── page structure ────────────────────────────────────────────────────────
  test.describe('page structure', () => {
    test('should render the correct URL and heading', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');
      await expect(page.locator('h1')).toContainText('Credit Health');
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should render the refresh score button', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');
      const btn = page.locator('[data-testid="refresh-score-btn"]');
      await expect(btn).toBeVisible();
      await expect(btn).toContainText('Refresh');
    });

    test('should set document title to "Credit Health"', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveTitle(/Credit Health/i);
    });

    test('should mark Credit Health nav link as active in sidebar', async ({ page }) => {
      await page.goto('/credit');
      const link = page.locator('aside nav a', { hasText: 'Credit Health' });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('aria-current', 'page');
    });

    test('should render either the data zones or the empty state', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');

      const verdictCard = page.locator('[data-testid="verdict-card"]');
      const emptyState = page.locator('text=No credit accounts synced');

      const hasData = await verdictCard.isVisible().catch(() => false);
      const isEmpty = await emptyState.isVisible().catch(() => false);
      expect(hasData || isEmpty).toBe(true);
    });
  });

  // ── empty state ───────────────────────────────────────────────────────────
  test.describe('empty state', () => {
    test('should show connect message when no credit accounts are synced', async ({ page }) => {
      await page.goto('/credit');
      if (await hasAccounts(page)) { test.skip(); return; }

      await expect(page.locator('text=No credit accounts synced')).toBeVisible();
      await expect(page.locator('text=/SimpleFIN/i').first()).toBeVisible();
      await expect(page.locator('[data-testid="verdict-card"]')).not.toBeVisible();
    });
  });

  // ── Zone 1 — The Verdict ─────────────────────────────────────────────────
  test.describe('Zone 1 — Verdict card', () => {
    test('should render verdict-card with credit score', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      await expect(page.locator('[data-testid="verdict-card"]')).toBeVisible();
      const scoreEl = page.locator('[data-testid="credit-score"]');
      await expect(scoreEl).toBeVisible();
      const scoreText = await scoreEl.textContent();
      expect(Number(scoreText?.trim())).toBeGreaterThanOrEqual(0);
    });

    test('should render the score gauge SVG inside the verdict card', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const card = page.locator('[data-testid="verdict-card"]');
      await expect(card.locator('svg').first()).toBeVisible();
      // Gauge track arc must be present
      await expect(card.locator('path').first()).toBeVisible();
    });

    test('should render factors-summary with all six factor labels', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const summary = page.locator('[data-testid="factors-summary"]');
      await expect(summary).toBeVisible();

      const factorLabels = ['Payment history', 'Utilization', 'Credit age', 'Accounts', 'Hard inquiries', 'Derogatory'];
      for (const label of factorLabels) {
        await expect(summary.getByText(label, { exact: false }).first()).toBeVisible();
      }
    });

    test('should render exactly six factor mini-cards inside factors-summary', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const miniCards = page.locator('[data-testid="factors-summary"] > div');
      await expect(miniCards).toHaveCount(6);
    });

    test('should show score-change pill when trend data spans at least two months', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const pill = page.locator('[data-testid="score-change"]');
      const hasChange = await pill.isVisible().catch(() => false);
      if (hasChange) {
        await expect(pill).toContainText(/pts/i);
      }
    });

    test('should show sparkline SVG when utilization history is available', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const sparkline = page.locator('[data-testid="score-sparkline"]');
      const hasSparkline = await sparkline.isVisible().catch(() => false);
      if (hasSparkline) {
        await expect(sparkline.locator('svg')).toBeVisible();
        // Must show a date range label
        await expect(sparkline.locator('span').first()).not.toBeEmpty();
      }
    });
  });

  // ── Zone 2 — Lender Lens ─────────────────────────────────────────────────
  test.describe('Zone 2 — Lender lens', () => {
    test('should render the lender-lens section with all three cards', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      await expect(page.locator('[data-testid="lender-lens"]')).toBeVisible();
      await expect(page.locator('[data-testid="lender-card-mortgage"]')).toBeVisible();
      await expect(page.locator('[data-testid="lender-card-auto"]')).toBeVisible();
      await expect(page.locator('[data-testid="lender-card-cards"]')).toBeVisible();
    });

    test('should show a rate or odds value on the mortgage card', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const card = page.locator('[data-testid="lender-card-mortgage"]');
      await expect(card).toBeVisible();
      // Rate div contains a % value — e.g. "~6.4%" or "N/A"
      await expect(card.getByText(/\d+\.?\d*%|N\/A/).first()).toBeVisible();
    });

    test('should show a rate or odds value on the auto loan card', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const card = page.locator('[data-testid="lender-card-auto"]');
      await expect(card).toBeVisible();
      await expect(card.getByText(/\d+\.?\d*%/).first()).toBeVisible();
    });

    test('should show approval odds on the credit cards card', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const card = page.locator('[data-testid="lender-card-cards"]');
      await expect(card).toBeVisible();
      await expect(card.getByText(/\d+%/).first()).toBeVisible();
    });

    test('should show a verdict label on each lender card', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      for (const testId of ['lender-card-mortgage', 'lender-card-auto', 'lender-card-cards']) {
        const card = page.locator(`[data-testid="${testId}"]`);
        // Each card shows "Eligible", "Not eligible", or similar verdict text
        await expect(card.getByText(/Eligible|not eligible/i).first()).toBeVisible();
      }
    });
  });

  // ── Zone 3 — Actions Grid ─────────────────────────────────────────────────
  test.describe('Zone 3 — Actions grid', () => {
    test('should render actions-grid with both columns', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      await expect(page.locator('[data-testid="actions-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="actions-now"]')).toBeVisible();
      await expect(page.locator('[data-testid="actions-habit"]')).toBeVisible();
    });

    test('should render "Do this now" column with amber header', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const nowCol = page.locator('[data-testid="actions-now"]');
      await expect(nowCol).toBeVisible();
      await expect(nowCol.getByText('Do this now')).toBeVisible();
      await expect(nowCol.getByText('High-impact, can action today')).toBeVisible();
    });

    test('should render "Build this habit" column with three static items', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const habitCol = page.locator('[data-testid="actions-habit"]');
      await expect(habitCol).toBeVisible();
      await expect(habitCol.getByText('Build this habit')).toBeVisible();

      const habitItems = habitCol.locator('[data-testid="action-item"]');
      await expect(habitItems).toHaveCount(3);
    });

    test('should show "+" impact values on habit action items', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const habitItems = page.locator('[data-testid="actions-habit"] [data-testid="action-item"]');
      const count = await habitItems.count();
      expect(count).toBeGreaterThanOrEqual(1);

      // Each item must show a +N impact value
      for (let i = 0; i < count; i++) {
        const item = habitItems.nth(i);
        await expect(item.getByText(/^\+\d+$/).first()).toBeVisible();
      }
    });

    test('should show payment habits action in the habit column', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const habitCol = page.locator('[data-testid="actions-habit"]');
      await expect(habitCol.getByText(/payments on time/i).first()).toBeVisible();
    });

    test('should show utilization or limit increase action in "Do this now" when util is high', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const nowCol = page.locator('[data-testid="actions-now"]');
      const hasItems = await nowCol.locator('[data-testid="action-item"]').count();

      // If there are "Do this now" items, each must have an impact value and a title
      if (hasItems > 0) {
        const firstItem = nowCol.locator('[data-testid="action-item"]').first();
        await expect(firstItem.getByText(/^\+\d+$/).first()).toBeVisible();
        await expect(firstItem.locator('div').filter({ hasText: /\w{5,}/ }).first()).toBeVisible();
      }
    });

    test('should show "nothing urgent" message in Do this now when utilization is healthy', async ({ page }) => {
      await page.goto('/credit');
      if (!await hasAccounts(page)) { test.skip(); return; }

      const nowCol = page.locator('[data-testid="actions-now"]');
      const itemCount = await nowCol.locator('[data-testid="action-item"]').count();
      if (itemCount === 0) {
        await expect(nowCol.getByText(/nothing urgent|healthy/i)).toBeVisible();
      }
    });
  });
});
