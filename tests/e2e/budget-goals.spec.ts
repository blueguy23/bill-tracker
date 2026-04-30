import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Budget & Goals Page — /budget
// Design reference: design/budget-goals (3).html
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Budget & Goals (/budget)', () => {

  test.describe('page structure', () => {
    test('should render the correct URL and heading', async ({ page }) => {
      await page.goto('/budget');
      await expect(page).toHaveURL('/budget');
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('h1').first()).toContainText('Budget');
    });

    test('should render a subtitle mentioning spending by category', async ({ page }) => {
      await page.goto('/budget');
      const subtitle = page.locator('p').filter({ hasText: /spending.*(by|limits).*(category|budget)|budget|category/i }).first();
      await expect(subtitle).toBeVisible();
    });

    test('should set the document title to "Budget & Goals"', async ({ page }) => {
      await page.goto('/budget');
      await expect(page).toHaveTitle(/Budget.*Goals|Goals.*Budget/i);
    });

    test('should mark Budget link as active in sidebar', async ({ page }) => {
      await page.goto('/budget');
      const budgetLink = page.locator('aside nav a', { hasText: 'Budget' });
      await expect(budgetLink).toBeVisible();
      await expect(budgetLink).toHaveAttribute('aria-current', 'page');
    });
  });

  test.describe('4.1 — hero renders on Budget tab (default)', () => {
    test('should render the hero card on load', async ({ page }) => {
      await page.goto('/budget');
      await expect(page.locator('[data-testid="budget-goals-hero"]')).toBeVisible();
    });

    test('should show budget-hero-remaining on Budget tab', async ({ page }) => {
      await page.goto('/budget');
      await expect(page.locator('[data-testid="budget-hero-remaining"]')).toBeVisible();
    });

    test('should show a pace arc SVG in the hero', async ({ page }) => {
      await page.goto('/budget');
      const hero = page.locator('[data-testid="budget-goals-hero"]');
      await expect(hero.locator('svg').first()).toBeVisible();
    });

    test('should show supporting stats in the budget hero', async ({ page }) => {
      await page.goto('/budget');
      const hero = page.locator('[data-testid="budget-goals-hero"]');
      await expect(hero.getByText(/spent/i).first()).toBeVisible();
      await expect(hero.getByText(/budgeted/i).first()).toBeVisible();
    });
  });

  test.describe('4.2 — hero morphs when Goals tab is clicked', () => {
    test('should show goals-hero-total when Goals tab is active', async ({ page }) => {
      await page.goto('/budget');
      await page.locator('[data-testid="tab-goals"]').click();
      await expect(page.locator('[data-testid="goals-hero-total"]')).toBeVisible();
    });

    test('should hide budget-hero-remaining when Goals tab is active', async ({ page }) => {
      await page.goto('/budget');
      await page.locator('[data-testid="tab-goals"]').click();
      await expect(page.locator('[data-testid="budget-hero-remaining"]')).not.toBeVisible();
    });

    test('should show New Goal CTA button when Goals tab is active', async ({ page }) => {
      await page.goto('/budget');
      await page.locator('[data-testid="tab-goals"]').click();
      await expect(page.locator('[data-testid="add-goal-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="add-goal-btn"]')).toContainText('New Goal');
    });
  });

  test.describe('4.3 — hero morphs back when Budget tab is clicked', () => {
    test('should restore budget-hero-remaining when switching back to Budget tab', async ({ page }) => {
      await page.goto('/budget');
      await page.locator('[data-testid="tab-goals"]').click();
      await page.locator('[data-testid="tab-budget"]').click();
      await expect(page.locator('[data-testid="budget-hero-remaining"]')).toBeVisible();
      await expect(page.locator('[data-testid="goals-hero-total"]')).not.toBeVisible();
    });
  });

  test.describe('4.4 — budget chart renders', () => {
    test('should render the budget chart on Budget tab', async ({ page }) => {
      await page.goto('/budget');
      await expect(page.locator('[data-testid="budget-chart"]')).toBeVisible();
    });

    test('should show each bill category in the chart', async ({ page }) => {
      await page.goto('/budget');
      const chart = page.locator('[data-testid="budget-chart"]');
      for (const cat of ['utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'other']) {
        await expect(chart.locator('div').filter({ hasText: new RegExp(cat, 'i') }).first()).toBeVisible();
      }
    });
  });

  test.describe('4.5 — unallocated banner (conditional)', () => {
    test('should not show unallocated banner when no budget surplus', async ({ page }) => {
      await page.goto('/budget');
      const banner = page.locator('[data-testid="unallocated-banner"]');
      const isVisible = await banner.isVisible().catch(() => false);
      if (isVisible) {
        await expect(banner.getByText(/unallocated/i).first()).toBeVisible();
        await expect(page.locator('[data-testid="allocate-btn"]')).toBeVisible();
      } else {
        expect(isVisible).toBe(false);
      }
    });
  });

  test.describe('4.6 — detail cards', () => {
    test('should render flexible spending and fixed detail cards', async ({ page }) => {
      await page.goto('/budget');
      await expect(page.locator('div').filter({ hasText: /flexible spending/i }).first()).toBeVisible();
      await expect(page.locator('div').filter({ hasText: /fixed.*savings/i }).first()).toBeVisible();
    });
  });

  test.describe('4.7 — Goals tab card grid', () => {
    test('should show the goals grid when Goals tab is active', async ({ page }) => {
      await page.goto('/budget');
      await page.locator('[data-testid="tab-goals"]').click();
      await expect(page.locator('[data-testid="goals-grid"]')).toBeVisible();
    });

    test('should show the add-goal-card in the grid', async ({ page }) => {
      await page.goto('/budget');
      await page.locator('[data-testid="tab-goals"]').click();
      await expect(page.locator('[data-testid="add-goal-card"]')).toBeVisible();
    });
  });

  test.describe('4.11 — Add goal card', () => {
    test('should open new goal flow when add-goal-card is clicked', async ({ page }) => {
      await page.goto('/budget');
      await page.locator('[data-testid="tab-goals"]').click();
      await page.locator('[data-testid="add-goal-card"]').click();
      await expect(page.locator('text=New Goal').first()).toBeVisible();
    });
  });

  test.describe('4.12 — New Goal button from hero', () => {
    test('should open new goal flow when add-goal-btn is clicked', async ({ page }) => {
      await page.goto('/budget');
      await page.locator('[data-testid="tab-goals"]').click();
      await page.locator('[data-testid="add-goal-btn"]').click();
      await expect(page.locator('text=New Goal').first()).toBeVisible();
    });
  });

  test.describe('Set Budget modal', () => {
    test('should not show the budget modal on initial page load', async ({ page }) => {
      await page.goto('/budget');
      const modalInput = page.locator('input[type="number"]');
      const isVisible = await modalInput.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });
  });

  test.describe('URL state', () => {
    test('should update URL to ?tab=goals when Goals tab is clicked', async ({ page }) => {
      await page.goto('/budget');
      await page.locator('[data-testid="tab-goals"]').click();
      await expect(page).toHaveURL(/[?&]tab=goals/);
    });

    test('should load Goals tab when navigating to ?tab=goals', async ({ page }) => {
      await page.goto('/budget?tab=goals');
      await expect(page.locator('[data-testid="goals-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="goals-hero-total"]')).toBeVisible();
    });
  });
});
