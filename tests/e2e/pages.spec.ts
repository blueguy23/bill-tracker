import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Recurring Bills Page — /recurring
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Recurring Bills Page (/recurring)', () => {
  test.describe('page structure', () => {
    test('should render the correct URL, heading, and subtitle', async ({ page }) => {
      await page.goto('/recurring');

      await expect(page).toHaveURL('/recurring');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Recurring Bills');
    });

    test('should render a subtitle that reflects the recurring bill count', async ({ page }) => {
      await page.goto('/recurring');

      // Subtitle is either "No recurring bills" or "{n} recurring bill(s)"
      const subtitle = page.locator('h1 + p, h1 ~ p').first();
      await expect(subtitle).toBeVisible();

      const text = await subtitle.textContent();
      const isValidSubtitle =
        text?.trim() === 'No recurring bills' ||
        /^\d+ recurring bills?$/.test(text?.trim() ?? '');

      expect(isValidSubtitle, `Unexpected subtitle: "${text}"`).toBe(true);
    });

    test('should render the sidebar with navigation links', async ({ page }) => {
      await page.goto('/recurring');

      await expect(page.locator('aside')).toBeVisible();
      await expect(page.locator('aside nav a', { hasText: 'Dashboard' })).toBeVisible();
      await expect(page.locator('aside nav a', { hasText: 'Recurring' })).toBeVisible();
    });

    test('should mark Recurring link as active in sidebar', async ({ page }) => {
      await page.goto('/recurring');

      const recurringLink = page.locator('aside nav a', { hasText: 'Recurring' });
      await expect(recurringLink).toBeVisible();
      await expect(recurringLink).toHaveClass(/bg-white/);
    });
  });

  test.describe('bills display', () => {
    test('should render the All Bills section with heading and count text', async ({ page }) => {
      await page.goto('/recurring');

      await expect(page.locator('h2').filter({ hasText: 'All Bills' })).toBeVisible();
      // Count text exists — either "No bills" or "{n} bill(s)"
      const countText = page.locator('h2').filter({ hasText: 'All Bills' }).locator('~ p');
      await expect(countText).toBeVisible();
    });

    test('should render the Add Bill button', async ({ page }) => {
      await page.goto('/recurring');

      const addBillBtn = page.locator('[data-testid="add-bill-btn"]');
      await expect(addBillBtn).toBeVisible();
      await expect(addBillBtn).toContainText('Add Bill');
      await expect(addBillBtn).toBeEnabled();
    });

    test('should show table with correct columns when bills exist, or empty state when not', async ({ page }) => {
      await page.goto('/recurring');

      const billsTable = page.locator('[data-testid="bills-table"]');
      const emptyState = page.locator('p.text-zinc-500').filter({ hasText: 'No bills yet' });

      const hasTable = await billsTable.isVisible().catch(() => false);

      if (hasTable) {
        // Table headers must be present and in order
        await expect(billsTable.locator('th', { hasText: 'Name' })).toBeVisible();
        await expect(billsTable.locator('th', { hasText: 'Amount' })).toBeVisible();
        await expect(billsTable.locator('th', { hasText: 'Due Date' })).toBeVisible();
        await expect(billsTable.locator('th', { hasText: 'Category' })).toBeVisible();
        await expect(billsTable.locator('th', { hasText: 'Status' })).toBeVisible();
      } else {
        await expect(emptyState).toBeVisible();
      }
    });

    test('should show only recurring bills (all rows must be recurring)', async ({ page }) => {
      await page.goto('/recurring');

      const billsTable = page.locator('[data-testid="bills-table"]');
      const hasTable = await billsTable.isVisible().catch(() => false);

      if (hasTable) {
        // Every row in the recurring page shows a recurrence interval label
        // (weekly / biweekly / monthly / quarterly / yearly) in the name cell
        const rows = billsTable.locator('tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(0);

        for (let i = 0; i < rowCount; i++) {
          const row = rows.nth(i);
          const nameCell = row.locator('td').first();
          // Recurring rows have a recurrenceInterval label beneath the bill name
          const intervalLabel = nameCell.locator('span').filter({
            hasText: /weekly|biweekly|monthly|quarterly|yearly/i,
          });
          await expect(intervalLabel).toBeVisible();
        }
      }
    });
  });

  test.describe('navigation back to dashboard', () => {
    test('should navigate to dashboard when Dashboard sidebar link is clicked', async ({ page }) => {
      await page.goto('/recurring');

      await page.locator('aside nav a', { hasText: 'Dashboard' }).click();

      await expect(page).toHaveURL('/');
      await expect(page.locator('h1')).toContainText('Dashboard');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Monthly Summary Page — /summary
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Monthly Summary Page (/summary)', () => {
  test.describe('page structure', () => {
    test('should render the correct URL, heading, and subtitle', async ({ page }) => {
      await page.goto('/summary');

      await expect(page).toHaveURL('/summary');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Monthly Summary');
      await expect(page.locator('p').filter({ hasText: 'Spending breakdown by month' })).toBeVisible();
    });

    test('should mark Summary link as active in sidebar', async ({ page }) => {
      await page.goto('/summary');

      const summaryLink = page.locator('aside nav a', { hasText: 'Summary' });
      await expect(summaryLink).toBeVisible();
      await expect(summaryLink).toHaveClass(/bg-white/);
    });
  });

  test.describe('month navigation controls', () => {
    test('should render previous-month and next-month navigation buttons', async ({ page }) => {
      await page.goto('/summary');

      const prevBtn = page.locator('button[aria-label="Previous month"]');
      const nextBtn = page.locator('button[aria-label="Next month"]');

      await expect(prevBtn).toBeVisible();
      await expect(nextBtn).toBeVisible();
    });

    test('should display the current month label in the navigator heading', async ({ page }) => {
      await page.goto('/summary');

      // The month label is formatted as "Month Year" (e.g., "March 2026")
      const monthHeading = page.locator('h2.text-base.font-semibold');
      await expect(monthHeading).toBeVisible();

      const text = await monthHeading.textContent();
      // Should match a pattern like "March 2026"
      expect(text?.trim()).toMatch(/^[A-Z][a-z]+ \d{4}$/);
    });

    test('should advance to next month when next button is clicked', async ({ page }) => {
      await page.goto('/summary');

      const monthHeading = page.locator('h2.text-base.font-semibold');
      const initialText = await monthHeading.textContent();

      const nextBtn = page.locator('button[aria-label="Next month"]');
      await expect(nextBtn).toBeVisible();
      await nextBtn.click({ force: true });

      await expect(monthHeading).not.toHaveText(initialText?.trim() ?? '');
      const updatedText = await monthHeading.textContent();
      expect(updatedText?.trim()).toMatch(/^[A-Z][a-z]+ \d{4}$/);
    });

    test('should show a Today button after navigating away from current month', async ({ page }) => {
      await page.goto('/summary');

      const nextBtn = page.locator('button[aria-label="Next month"]');
      await expect(nextBtn).toBeVisible();
      await nextBtn.click({ force: true });

      // "Today" button appears only when selected month differs from current month
      const todayBtn = page.locator('button', { hasText: 'Today' });
      await expect(todayBtn).toBeVisible();
    });

    test('should return to current month when Today button is clicked', async ({ page }) => {
      await page.goto('/summary');

      const monthHeading = page.locator('h2.text-base.font-semibold');
      const initialText = await monthHeading.textContent();

      const nextBtn = page.locator('button[aria-label="Next month"]');
      await expect(nextBtn).toBeVisible();
      await nextBtn.click({ force: true });

      const todayBtn = page.locator('button', { hasText: 'Today' });
      await expect(todayBtn).toBeVisible();
      await todayBtn.click({ force: true });

      await expect(monthHeading).toHaveText(initialText?.trim() ?? '');
    });
  });

  test.describe('stat cards', () => {
    test('should render Total Owed, Total Paid, and Unpaid Bills stat cards', async ({ page }) => {
      await page.goto('/summary');

      await expect(page.locator('p').filter({ hasText: 'Total Owed' })).toBeVisible();
      await expect(page.locator('p').filter({ hasText: 'Total Paid' })).toBeVisible();
      await expect(page.locator('p').filter({ hasText: 'Unpaid Bills' })).toBeVisible();
    });

    test('should display currency-formatted values in monetary stat cards', async ({ page }) => {
      await page.goto('/summary');

      // At minimum there should be $0.00 values; we verify USD format with a regex
      const statGrid = page.locator('.grid.grid-cols-3');
      await expect(statGrid).toBeVisible();

      const statValues = statGrid.locator('p.text-\\[1\\.75rem\\]');
      const count = await statValues.count();
      expect(count).toBe(3);

      for (let i = 0; i < 2; i++) {
        const text = await statValues.nth(i).textContent();
        expect(text?.trim()).toMatch(/^\$[\d,]+\.\d{2}$/);
      }
    });
  });

  test.describe('empty state vs category table', () => {
    test('should render either a category breakdown table or an empty state message', async ({ page }) => {
      await page.goto('/summary');

      const categoryTable = page.locator('h3').filter({ hasText: 'By Category' });
      const emptyMsg = page.locator('p').filter({ hasText: 'No bills for this month' });

      const hasTable = await categoryTable.isVisible().catch(() => false);
      const hasEmpty = await emptyMsg.isVisible().catch(() => false);

      expect(hasTable || hasEmpty, 'Expected either a category table or an empty state message').toBe(true);
    });

    test('should show empty state guidance copy when no bills for selected month', async ({ page }) => {
      await page.goto('/summary');

      const emptyMsg = page.locator('p').filter({ hasText: 'No bills for this month' });
      const hasEmpty = await emptyMsg.isVisible().catch(() => false);

      if (hasEmpty) {
        await expect(emptyMsg).toBeVisible();
        await expect(page.locator('p').filter({ hasText: 'Recurring bills will always appear here' })).toBeVisible();
      }
    });

    test('should render category table with correct columns when data exists', async ({ page }) => {
      await page.goto('/summary');

      const categoryTable = page.locator('h3').filter({ hasText: 'By Category' });
      const hasTable = await categoryTable.isVisible().catch(() => false);

      if (hasTable) {
        const tableEl = page.locator('table').last();
        await expect(tableEl.locator('th', { hasText: 'Category' })).toBeVisible();
        await expect(tableEl.locator('th', { hasText: 'Bills' })).toBeVisible();
        await expect(tableEl.locator('th', { hasText: 'Total' })).toBeVisible();
        await expect(tableEl.locator('th').filter({ hasText: /^Paid$/ })).toBeVisible();
        await expect(tableEl.locator('th', { hasText: 'Unpaid' })).toBeVisible();
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Budget Page — /budget
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Budget Page (/budget)', () => {
  test.describe('page structure', () => {
    test('should render the correct URL, heading, and subtitle', async ({ page }) => {
      await page.goto('/budget');

      await expect(page).toHaveURL('/budget');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Budget');
    });

    test('should render a subtitle containing "spending by category"', async ({ page }) => {
      await page.goto('/budget');

      const subtitle = page.locator('p').filter({ hasText: /spending by category/i });
      await expect(subtitle).toBeVisible();
    });

    test('should set the document title to "Budget — Bill Tracker"', async ({ page }) => {
      await page.goto('/budget');

      await expect(page).toHaveTitle('Budget — Bill Tracker');
    });

    test('should mark Budget link as active in sidebar', async ({ page }) => {
      await page.goto('/budget');

      const budgetLink = page.locator('aside nav a', { hasText: 'Budget' });
      await expect(budgetLink).toBeVisible();
      await expect(budgetLink).toHaveClass(/bg-white/);
    });
  });

  test.describe('budget cards grid', () => {
    test('should render a budget card grid when API returns budgets data', async ({ page }) => {
      await page.goto('/budget');

      // BudgetView renders a grid of budget cards; even with no budgets set,
      // the handler returns all BILL_CATEGORIES so the grid always has entries
      const cardGrid = page.locator('.grid');
      await expect(cardGrid.first()).toBeVisible();
    });

    test('should render a card for each valid bill category', async ({ page }) => {
      await page.goto('/budget');

      // The handler always returns all 6 categories regardless of whether a budget is set
      const categories = ['utilities', 'subscriptions', 'insurance', 'rent', 'loans', 'other'];
      for (const cat of categories) {
        const card = page.locator('[data-testid]').filter({ hasText: new RegExp(cat, 'i') });
        const genericCard = page.locator('div').filter({ hasText: new RegExp(cat, 'i') }).first();
        // At least one element with the category name should be present
        await expect(genericCard).toBeVisible();
      }
    });
  });

  test.describe('Set Budget modal', () => {
    test('should not display the budget modal on initial page load', async ({ page }) => {
      await page.goto('/budget');

      // SetBudgetModal is closed by default; its content should not be visible
      const modalContent = page.locator('input[type="number"]');
      const isVisible = await modalContent.isVisible().catch(() => false);
      // Modal input should not be visible when no card has been clicked
      expect(isVisible).toBe(false);
    });
  });

  test.describe('navigation', () => {
    test('should navigate to dashboard when Dashboard link is clicked', async ({ page }) => {
      await page.goto('/budget');

      await page.locator('aside nav a', { hasText: 'Dashboard' }).click();

      await expect(page).toHaveURL('/');
      await expect(page.locator('h1')).toContainText('Dashboard');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-page: Active Nav State
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Credit Health Page (/credit)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Credit Health Page (/credit)', () => {
  test.describe('page structure', () => {
    test('should render correct URL, heading, and subtitle', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveURL('/credit');
      await expect(page.locator('h1')).toContainText('Credit Health');
      await expect(page.locator('p').filter({ hasText: 'Credit utilization and payment activity' })).toBeVisible();
    });

    test('should set the correct document title', async ({ page }) => {
      await page.goto('/credit');
      await expect(page).toHaveTitle(/Credit Health/);
    });

    test('should mark Credit Health link as active in sidebar', async ({ page }) => {
      await page.goto('/credit');
      const link = page.locator('aside nav a', { hasText: 'Credit Health' });
      await expect(link).toBeVisible();
      await expect(link).toHaveClass(/bg-white\/\[0\.08\]/);
    });
  });

  test.describe('score and overview', () => {
    test('should render a health score card or no-accounts message', async ({ page }) => {
      await page.goto('/credit');
      const scoreCard = page.locator('text=Health Score');
      const emptyState = page.locator('text=No credit accounts found');
      const hasScore = await scoreCard.isVisible().catch(() => false);
      const hasEmpty = await emptyState.isVisible().catch(() => false);
      expect(hasScore || hasEmpty).toBe(true);
    });

    test('should render overall utilization section when accounts exist', async ({ page }) => {
      await page.goto('/credit');
      const hasAccounts = await page.locator('text=Overall Utilization').isVisible().catch(() => false);
      const hasEmpty = await page.locator('text=No credit accounts found').isVisible().catch(() => false);
      expect(hasAccounts || hasEmpty).toBe(true);
    });
  });

  test.describe('accounts grid', () => {
    test('should render accounts grid or empty state', async ({ page }) => {
      await page.goto('/credit');
      const hasGrid = await page.locator('text=Credit Accounts').isVisible().catch(() => false);
      const hasEmpty = await page.locator('text=No credit accounts found').isVisible().catch(() => false);
      expect(hasGrid || hasEmpty).toBe(true);
    });
  });

  test.describe('recent payments', () => {
    test('should render the Recent Payments section when accounts exist', async ({ page }) => {
      await page.goto('/credit');
      const hasPayments = await page.locator('text=Recent Payments').isVisible().catch(() => false);
      const hasEmpty = await page.locator('text=No credit accounts found').isVisible().catch(() => false);
      expect(hasPayments || hasEmpty).toBe(true);
    });
  });

  test.describe('navigation', () => {
    test('should navigate to dashboard when Dashboard link is clicked', async ({ page }) => {
      await page.goto('/credit');
      await page.locator('aside nav a', { hasText: 'Dashboard' }).click();
      await expect(page).toHaveURL('/');
      await expect(page.locator('h1')).toContainText('Dashboard');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Active Navigation State', () => {
  const routes = [
    { path: '/', label: 'Dashboard' },
    { path: '/recurring', label: 'Recurring' },
    { path: '/summary', label: 'Summary' },
    { path: '/budget', label: 'Budget' },
    { path: '/credit', label: 'Credit Health' },
  ];

  for (const { path, label } of routes) {
    test(`should mark "${label}" as active when on ${path}`, async ({ page }) => {
      await page.goto(path);

      const activeLink = page.locator('aside nav a', { hasText: label });
      await expect(activeLink).toBeVisible();
      await expect(activeLink).toHaveClass(/bg-white\/\[0\.08\]/);

      // All other navigable links should NOT have the active class (hover:bg-white/[0.04] is not active)
      for (const other of routes) {
        if (other.path === path) continue;
        const otherLink = page.locator('aside nav a', { hasText: other.label });
        await expect(otherLink).not.toHaveClass(/bg-white\/\[0\.08\]/);
      }
    });
  }
});
