---
id: 04-budget-alerts
title: Budget & Alerts
edition: bill-tracker
depends_on:
  - 03-simplefin-core-sync
source_files:
  - src/types/budget.ts
  - src/adapters/budgets.ts
  - src/adapters/quickAdd.ts
  - src/handlers/budgets.ts
  - src/lib/budget/engine.ts
  - src/lib/budget/rollover.ts
  - src/app/api/v1/budgets/route.ts
  - src/app/api/v1/budgets/[category]/route.ts
routes:
  - GET /api/v1/budgets
  - PUT /api/v1/budgets/[category]
models:
  - budgets
  - quickAddTransactions
  - dismissedSubscriptions
test_files:
  - tests/unit/budget-handlers.test.ts
known_issues: []
---

# 04 — Budget & Alerts

## Purpose

Lets users set monthly spending limits per bill category. Tracks spending against
those limits using both synced transactions and manually entered quick-adds.
Fires Discord notifications when a category hits warning (90%) or over-budget (100%).
Rollover balances carry unspent amounts into the following month.

## Architecture

```
GET /api/v1/budgets
  └── handleGetBudgets(db)
        ├── listBudgets(db)                — budget targets
        ├── listUnmatchedQuickAdds(db)     — manual spend entries not yet deduped
        ├── listTransactionsForMonth(db)   — SimpleFIN transactions for current month
        └── for each BILL_CATEGORY:
              ├── computeSpending()        — txns + quick-adds, category-filtered
              ├── computeEffectiveBudget() — monthlyAmount + rolloverBalance
              ├── computeBurnRate()        — linear + 7-day rolling projections
              └── computeCategoryStatus() — on_track / warning / over_budget

PUT /api/v1/budgets/[category]
  └── handleSetBudget(db, category, req)
        ├── upsertBudget()                 — create or update the budget doc
        └── checkBudgetNotifications()     — fires Discord if status changed
```

## Data Model

### `budgets` collection

One document per bill category. `_id` is the category string itself.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | string | Same as `category` (e.g. `"housing"`) |
| `category` | BillCategory | Bill category this budget applies to |
| `monthlyAmount` | number | User-set monthly limit |
| `rolloverBalance` | number | Carried from previous month (can be positive or negative) |
| `updatedAt` | Date | Last modified |

### `quickAddTransactions` collection

Manual spend entries entered by the user before the transaction posts from SimpleFIN.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | string | UUID |
| `description` | string | User-entered label |
| `amount` | number | Positive — expense amount |
| `category` | BillCategory | Category to debit |
| `addedAt` | Date | When the user entered it |
| `matchedTransactionId` | string \| null | Set when deduped against a real transaction |

## Budget Engine (`src/lib/budget/engine.ts`)

### computeSpending

Sums absolute values of negative transactions + unmatched quick-add amounts for the
given category and month. Quick-adds with `matchedTransactionId !== null` are excluded
to prevent double-counting.

### computeEffectiveBudget

`monthlyAmount + rolloverBalance`. Positive rollover (unspent from last month) expands
the budget; negative rollover (overspent) shrinks it.

### computeBurnRate

Returns two projections and a divergence flag:

| Field | Meaning |
|-------|---------|
| `linearDailyRate` | `totalSpent / daysElapsed` |
| `linearProjectedTotal` | `linearDailyRate × daysInMonth` |
| `rollingAvgDailyRate` | Average daily spend over last 7 days |
| `rollingProjectedTotal` | `rollingAvgDailyRate × daysInMonth` |
| `divergent` | True when the two projections differ by >15% of effectiveBudget |

### computeCategoryStatus

| Condition | Status |
|-----------|--------|
| `projectedTotal > effectiveBudget` | `over_budget` |
| `projectedTotal >= effectiveBudget × 0.9` | `warning` |
| Otherwise | `on_track` |

## Quick-Add Deduplication (`src/lib/budget/dedupe.ts`)

When a quick-add matches a real transaction (same category, amount within $0.50,
date within 3 days), `matchedTransactionId` is set on the quick-add so it no longer
counts toward spending. This prevents double-counting when the transaction posts.

## Rollover (`src/lib/budget/rollover.ts`)

`applyMonthEndRollover(db, month)` is called once at end-of-month. For each budget:

```
newRolloverBalance = effectiveBudget - actualSpent
```

Positive = unspent funds carry forward. Negative = overspend reduces next month's budget.

## API Endpoints

### GET /api/v1/budgets

Returns all categories with their current month's spending summary.

- **200:** `{ month: "YYYY-MM", budgets: CategoryBudgetSummary[] }`
- Categories without a set budget return `monthlyAmount: null, status: null`.

### PUT /api/v1/budgets/[category]

Creates or updates the budget for a category.

- **Body:** `{ monthlyAmount: number }` (must be positive)
- **400** for unknown category or invalid amount
- **200:** `{ budget: Budget }`
- Fires Discord warning/alert notification if the category is already at warning or over-budget after the update.

## Notifications

Fires automatically after `PUT /api/v1/budgets/[category]` if the new budget puts
the category into warning (≥90%) or over-budget (≥100%) status. Uses the same
Discord webhook as bill-due and credit alerts. Subject to 24h cooldown per category.

## Business Rules

1. Every `BILL_CATEGORY` always appears in the GET response — unset budgets return `null` amounts.
2. Quick-adds count as spend immediately; deduplication removes them once the transaction posts.
3. Rollover is applied once at month-end — mid-month balance is always computed live.
4. Notifications are fire-and-forget (`void`) — budget update response is not delayed by webhook call.

## Known Issues

_None._
