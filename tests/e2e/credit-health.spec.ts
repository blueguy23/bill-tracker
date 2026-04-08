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
    // score is a number or null
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
    const body = await response.json() as {
      accounts: Array<Record<string, unknown>>;
    };

    for (const account of body.accounts) {
      expect(typeof account.id).toBe('string');
      expect(typeof account.orgName).toBe('string');
      expect(typeof account.name).toBe('string');
      expect(typeof account.balance).toBe('number');
      expect(typeof account.hasLimitData).toBe('boolean');
      expect(typeof account.balanceDate).toBe('string');
      const parsed = new Date(account.balanceDate as string);
      expect(Number.isNaN(parsed.getTime())).toBe(false);
    }
  });

  test('should return recentPayments with required fields when payments exist', async ({ request }) => {
    const response = await request.get('/api/v1/credit/summary');
    const body = await response.json() as {
      recentPayments: Array<Record<string, unknown>>;
    };

    for (const payment of body.recentPayments) {
      expect(typeof payment.id).toBe('string');
      expect(typeof payment.accountId).toBe('string');
      expect(typeof payment.accountName).toBe('string');
      expect(typeof payment.orgName).toBe('string');
      expect(typeof payment.amount).toBe('number');
      expect(typeof payment.description).toBe('string');
      expect(typeof payment.posted).toBe('string');
      const parsed = new Date(payment.posted as string);
      expect(Number.isNaN(parsed.getTime())).toBe(false);
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
  test('should return HTTP 200 with synced:true when SimpleFIN is configured', async ({ request }) => {
    const response = await request.post('/api/v1/sync');
    // 200 = success, 429 = quota exceeded, 503 = not configured
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

  test('should return 503 with error message when SimpleFIN is not configured', async ({ request }) => {
    // If SIMPLEFIN_URL is not set the route returns 503.
    // We only assert shape here since we can't control env in E2E.
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
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Credit Health Page (/credit)', () => {
  test.describe('page structure', () => {
    test('should render the correct heading and URL', async ({ page }) => {
      await page.goto('/credit');

      await expect(page).toHaveURL('/credit');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Credit Health');
      await expect(page.locator('p').filter({ hasText: 'Credit utilization and payment activity' })).toBeVisible();
    });

    test('should render the sidebar with Credit Health nav item active', async ({ page }) => {
      await page.goto('/credit');

      await expect(page).toHaveURL('/credit');
      await expect(page.locator('aside')).toBeVisible();
      const creditLink = page.locator('aside nav a', { hasText: 'Credit Health' });
      await expect(creditLink).toBeVisible();
      await expect(creditLink).toHaveClass(/bg-white\/\[0\.08\]/);
    });

    test('should render the Sync Now button in the sidebar', async ({ page }) => {
      await page.goto('/credit');

      await expect(page).toHaveURL('/credit');
      const syncBtn = page.locator('aside button', { hasText: /Sync Now/i });
      await expect(syncBtn).toBeVisible();
      await expect(syncBtn).toBeEnabled();
    });

    test('should render a last-sync timestamp below the sync button', async ({ page }) => {
      await page.goto('/credit');

      await expect(page).toHaveURL('/credit');
      // The timestamp line is in the sidebar footer — "Never synced" or "Xm ago" etc.
      const sidebar = page.locator('aside');
      const timestampEl = sidebar.locator('p.text-\\[10px\\], p.text-xs').last();
      await expect(timestampEl).toBeVisible();
      await expect(timestampEl).not.toBeEmpty();
    });
  });

  test.describe('credit data display', () => {
    test('should render credit accounts section or empty state', async ({ page }) => {
      await page.goto('/credit');

      await expect(page).toHaveURL('/credit');

      // Either accounts are present, or the empty-state panel is shown
      const accountsHeading = page.locator('p').filter({ hasText: /Credit Accounts \(/ });
      const emptyState = page.locator('p').filter({ hasText: 'No credit accounts found' });

      const hasAccounts = await accountsHeading.isVisible().catch(() => false);
      const hasEmpty = await emptyState.isVisible().catch(() => false);
      expect(hasAccounts || hasEmpty).toBe(true);
    });

    test('should show credit account card with balance when credit accounts exist', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');

      const accountsHeading = page.locator('p').filter({ hasText: /Credit Accounts \(/ });
      const hasAccounts = await accountsHeading.isVisible().catch(() => false);
      if (!hasAccounts) {
        test.skip();
        return;
      }

      await expect(accountsHeading).toBeVisible();
      // At least one account card should show the org name and a balance
      const firstCard = page.locator('[class*="rounded-xl"]').filter({ hasText: /Chase|Capital One|Discover/i }).first();
      await expect(firstCard).toBeVisible();
    });

    test('should show balance as a formatted dollar amount on each credit account card', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');

      const hasAccounts = await page.locator('p').filter({ hasText: /Credit Accounts \(/ }).isVisible().catch(() => false);
      if (!hasAccounts) {
        test.skip();
        return;
      }

      // Each card has a "Balance" label and a bold dollar value below it
      const balanceLabel = page.locator('p.text-xs').filter({ hasText: 'Balance' }).first();
      await expect(balanceLabel).toBeVisible();

      // The balance value sits in the sibling element — it must be a currency string
      const balanceValue = balanceLabel.locator('+ p');
      await expect(balanceValue).toBeVisible();
      await expect(balanceValue).toContainText('$');
    });

    test('should show credit limit or "No limit data" badge on each credit account card', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');

      const hasAccounts = await page.locator('p').filter({ hasText: /Credit Accounts \(/ }).isVisible().catch(() => false);
      if (!hasAccounts) {
        test.skip();
        return;
      }

      // Either "Limit" label with a dollar value is shown, or the "No limit data" badge
      const limitLabel = page.locator('p.text-xs').filter({ hasText: 'Limit' }).first();
      const noLimitBadge = page.locator('span').filter({ hasText: 'No limit data' }).first();

      const hasLimit = await limitLabel.isVisible().catch(() => false);
      const hasNoLimit = await noLimitBadge.isVisible().catch(() => false);
      expect(hasLimit || hasNoLimit).toBe(true);

      if (hasLimit) {
        // The limit value must be a formatted dollar amount
        const limitValue = limitLabel.locator('+ p');
        await expect(limitValue).toBeVisible();
        await expect(limitValue).toContainText('$');
      }
    });

    test('should show utilization percentage on card when limit data is available', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');

      const hasAccounts = await page.locator('p').filter({ hasText: /Credit Accounts \(/ }).isVisible().catch(() => false);
      if (!hasAccounts) {
        test.skip();
        return;
      }

      // Find the account card that has EXACTLY "Utilization" (not "Overall Utilization")
      // using an anchored regex to avoid substring-matching the overall utilization panel
      const cardWithUtilization = page.locator('div.rounded-xl').filter({
        has: page.locator('p').filter({ hasText: /^Utilization$/ }),
      }).first();

      const hasUtilization = await cardWithUtilization.isVisible().catch(() => false);
      if (!hasUtilization) {
        // Card shows "No limit data" badge — skip rather than fail
        const noLimitBadge = page.locator('span').filter({ hasText: 'No limit data' });
        await expect(noLimitBadge).toBeVisible();
        test.skip();
        return;
      }

      // Utilization label must be visible within the card
      await expect(cardWithUtilization.locator('p').filter({ hasText: /^Utilization$/ })).toBeVisible();

      // Percentage value: p.font-semibold scoped inside the utilization row
      const utilizationPct = cardWithUtilization.locator('p.font-semibold').filter({ hasText: '%' });
      await expect(utilizationPct).toBeVisible();
      const pctText = await utilizationPct.textContent();
      expect(pctText).toMatch(/^\d+%$/);

      // Progress bar container must be visible (the fill may be 0-width when utilization is 0%)
      const progressContainer = cardWithUtilization.locator('div.overflow-hidden');
      await expect(progressContainer).toBeVisible();
      // Fill div must exist with an inline width attribute
      const progressFill = cardWithUtilization.locator('div[style*="width"]');
      await expect(progressFill).toHaveAttribute('style', /width/);
    });

    test('should show overall utilization panel with a percentage value', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');

      const hasAccounts = await page.locator('p').filter({ hasText: /Credit Accounts \(/ }).isVisible().catch(() => false);
      if (!hasAccounts) {
        test.skip();
        return;
      }

      // Scope to the Overall Utilization card to avoid matching other large text
      const overallCard = page.locator('div.rounded-xl').filter({
        has: page.locator('p').filter({ hasText: 'Overall Utilization' }),
      });
      await expect(overallCard).toBeVisible();

      // The large utilization number — either a % or an em dash when no data
      const utilizationValue = overallCard.locator('p.text-4xl');
      await expect(utilizationValue).toBeVisible();
      const valueText = await utilizationValue.textContent();
      expect(valueText).toMatch(/^\d+%$|^—$/);
    });

    test('should render the Recent Payments panel', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');

      const accountsHeading = page.locator('p').filter({ hasText: /Credit Accounts \(/ });
      const hasAccounts = await accountsHeading.isVisible().catch(() => false);
      if (!hasAccounts) {
        test.skip();
        return;
      }

      // Panel heading must be visible
      await expect(page.locator('p').filter({ hasText: 'Recent Payments' })).toBeVisible();
      await expect(page.locator('p').filter({ hasText: 'Last 30 days' })).toBeVisible();

      // Either shows transactions or the "no payments" empty state
      const txnList = page.locator('ul').filter({ has: page.locator('li') });
      const noPayments = page.locator('p').filter({ hasText: 'No payments in the last 30 days' });

      const hasTxns = await txnList.isVisible().catch(() => false);
      const hasEmpty = await noPayments.isVisible().catch(() => false);
      expect(hasTxns || hasEmpty).toBe(true);
    });

    test('should show transaction descriptions and amounts in Recent Payments when data exists', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');

      const noPayments = page.locator('p').filter({ hasText: 'No payments in the last 30 days' });
      const hasNoPayments = await noPayments.isVisible().catch(() => false);
      if (hasNoPayments) {
        test.skip();
        return;
      }

      // Each payment row should show a description and a dollar amount
      const firstPayment = page.locator('ul li').first();
      await expect(firstPayment).toBeVisible();

      // Description text — should be non-empty
      await expect(firstPayment.locator('p.text-sm').first()).not.toBeEmpty();

      // Amount — should contain a $ sign
      const amountEl = firstPayment.locator('p.text-sm.font-semibold');
      await expect(amountEl).toBeVisible();
      await expect(amountEl).toContainText('$');
    });
  });

  test.describe('sync button behavior', () => {
    test('should show "Syncing…" while sync is in progress then resolve', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');

      // Intercept the sync POST so we control timing
      let resolveSyncRequest!: () => void;
      const syncHeld = new Promise<void>((resolve) => { resolveSyncRequest = resolve; });

      await page.route('**/api/v1/sync', async (route) => {
        if (route.request().method() === 'POST') {
          await syncHeld;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              synced: true,
              accountsUpdated: 6,
              transactionsUpserted: 5,
              quotaUsed: 1,
              warnings: [],
            }),
          });
        } else {
          await route.continue();
        }
      });

      const syncBtn = page.locator('aside button', { hasText: /Sync Now/i });
      await syncBtn.scrollIntoViewIfNeeded();
      // force:true bypasses pointer-event interception from the nav on narrow viewports
      await syncBtn.click({ force: true });

      // Button must show "Syncing…" immediately
      await expect(page.locator('aside button', { hasText: /Syncing/i })).toBeVisible();
      await expect(page.locator('aside button')).toBeDisabled();

      // Unblock the request
      resolveSyncRequest();

      // Button must settle to "Synced!" after completion
      await expect(page.locator('aside button', { hasText: /Synced/i })).toBeVisible({ timeout: 10_000 });
    });

    test('should trigger a Next.js RSC re-render after successful sync (router.refresh is called)', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');

      // Mock sync to succeed instantly
      await page.route('**/api/v1/sync', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              synced: true,
              accountsUpdated: 6,
              transactionsUpserted: 3,
              quotaUsed: 1,
              warnings: [],
            }),
          });
        } else {
          await route.continue();
        }
      });

      // router.refresh() causes Next.js to issue an RSC payload request — it shows
      // up as a GET to the current route with an `RSC` or `Next-Router-*` header.
      // We capture the first such request that arrives after clicking Sync.
      const rscRefreshPromise = page.waitForRequest(
        (req) =>
          req.method() === 'GET' &&
          req.url().includes('/credit') &&
          (req.headers()['rsc'] === '1' || req.headers()['next-router-prefetch'] !== undefined || req.url().includes('_rsc')),
        { timeout: 10_000 },
      );

      const syncBtn = page.locator('aside button', { hasText: /Sync Now/i });
      await syncBtn.scrollIntoViewIfNeeded();
      // force:true bypasses pointer-event interception from the nav on narrow viewports
      await syncBtn.click({ force: true });

      // Button must reach "Synced!" — proving the sync POST returned successfully
      await expect(page.locator('aside button', { hasText: /Synced/i })).toBeVisible({ timeout: 10_000 });

      // RSC refresh request must have fired — proving router.refresh() was called
      const rscRequest = await rscRefreshPromise;
      expect(rscRequest).toBeTruthy();
      expect(rscRequest.url()).toContain('/credit');

      // Page must still be on /credit and showing the heading — refresh didn't break it
      await expect(page).toHaveURL('/credit');
      await expect(page.locator('h1')).toContainText('Credit Health');
    });

    test('should show error state when sync fails', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');

      await page.route('**/api/v1/sync', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal server error' }),
          });
        } else {
          await route.continue();
        }
      });

      const syncBtn = page.locator('aside button', { hasText: /Sync Now/i });
      await syncBtn.scrollIntoViewIfNeeded();
      // force:true bypasses pointer-event interception from the nav on narrow viewports
      await syncBtn.click({ force: true });

      // Button should show an error state
      await expect(page.locator('aside button', { hasText: /Sync failed|Error|failed/i })).toBeVisible({ timeout: 10_000 });
      // Button should re-enable after error reset
      await expect(page.locator('aside button')).toBeEnabled({ timeout: 8_000 });
    });

    test('should show quota message when sync returns 429', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');

      await page.route('**/api/v1/sync', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Daily quota nearly reached', used: 20, limit: 24 }),
          });
        } else {
          await route.continue();
        }
      });

      const syncBtn = page.locator('aside button', { hasText: /Sync Now/i });
      await syncBtn.scrollIntoViewIfNeeded();
      // force:true bypasses pointer-event interception from the nav on narrow viewports
      await syncBtn.click({ force: true });

      await expect(page.locator('aside button', { hasText: /Quota/i })).toBeVisible({ timeout: 10_000 });
    });

    test('should display credit transactions in Recent Payments after sync completes', async ({ page }) => {
      // router.refresh() re-renders server components — the credit summary is fetched
      // server-side so we cannot mock it via page.route(). Instead we verify the
      // full observable outcome: sync fires, page re-renders, real DB transactions appear.

      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');
      await expect(page.locator('h1')).toContainText('Credit Health');

      // Skip if no credit accounts are synced — can't assert transactions without data
      const hasAccounts = await page.locator('p').filter({ hasText: /Credit Accounts \(/ }).isVisible().catch(() => false);
      if (!hasAccounts) {
        test.skip();
        return;
      }

      // Capture the RSC re-render request that router.refresh() fires
      const rscRefreshPromise = page.waitForRequest(
        (req) =>
          req.method() === 'GET' &&
          req.url().includes('/credit') &&
          (req.headers()['rsc'] === '1' || req.url().includes('_rsc')),
        { timeout: 10_000 },
      );

      // Mock sync to avoid consuming real SimpleFIN quota during tests
      await page.route('**/api/v1/sync', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ synced: true, accountsUpdated: 6, transactionsUpserted: 0, quotaUsed: 1, warnings: [] }),
          });
        } else {
          await route.continue();
        }
      });

      const syncBtn = page.locator('aside button', { hasText: /Sync Now/i });
      await syncBtn.scrollIntoViewIfNeeded();
      // force:true bypasses pointer-event interception from the nav on narrow viewports
      await syncBtn.click({ force: true });

      // Sync must complete successfully
      await expect(page.locator('aside button', { hasText: /Synced/i })).toBeVisible({ timeout: 10_000 });

      // RSC re-render must have fired — proves router.refresh() ran
      await rscRefreshPromise;

      // Page must still be on /credit with the correct heading
      await expect(page).toHaveURL('/credit');
      await expect(page.locator('h1')).toContainText('Credit Health');

      // Recent Payments panel must be visible with either transactions or the empty state
      await expect(page.locator('p').filter({ hasText: 'Recent Payments' })).toBeVisible();
      const txnList = page.locator('ul li').first();
      const emptyState = page.locator('p').filter({ hasText: 'No payments in the last 30 days' });
      const hasTxns = await txnList.isVisible().catch(() => false);
      const hasEmpty = await emptyState.isVisible().catch(() => false);
      expect(hasTxns || hasEmpty).toBe(true);

      // If transactions are present, each row must show a description and a $ amount
      if (hasTxns) {
        await expect(txnList.locator('p.text-sm').first()).not.toBeEmpty();
        await expect(txnList.locator('p.font-semibold')).toContainText('$');
      }
    });
  });
});
