# Architecture Audit Matrix

> Generated 2026-05-14. Read this before any structural change.

## Domain Key

| Abbrev | Full Name |
|--------|-----------|
| Sync | Bank Account Sync & Aggregation |
| Cat | Transaction Categorization |
| Xfer | Transfer Detection |
| Bills | Bill Lifecycle Management |
| Subs | Subscription Detection & Tracking |
| AutoPay | Automatic Payment Detection |
| Budget | Budget Management & Spending Projection |
| CFlow | Cash Flow Analysis |
| QAdd | Quick-Add Manual Transactions |
| Credit | Credit Health & Utilization |
| AZEO | Credit Optimization (AZEO) |
| Notif | Notifications & Alerts |
| Profile | User Profile & Preferences |
| Export | Data Export |

---

## Presentation Layer (Pages, Components, API Routes)

| Domain | What exists | CMM |
|--------|------------|-----|
| **Sync** | API route delegates to handler; fires post-sync hooks (`enrichWithTrove`, `detectAutoPayments`, `checkCreditAlerts`) via fire-and-forget | 4 |
| **Cat** | `TxRow`, `TxCategoryBadge` — display only; category filter is UI state | 4 |
| **Xfer** | Component reads stored `isTransfer` field — no logic | 4 |
| **Bills** | `BillsView`, `BillTable`, `BillModal`; API routes delegate to handler | 4 |
| **Subs** | `SubscriptionsView`, `SubscriptionReviewModal`, `MatchReviewModal`, `NewSubscriptionsBanner`; routes delegate | 4 |
| **AutoPay** | Implicit — no dedicated UI, triggered from sync route | 2 |
| **Budget** | `BudgetView` has `paceStatus()` + percentage calc — presentation math, acceptable; `SetBudgetModal` | 4 |
| **CFlow** | `CashFlowCard`, `CashFlowToggle`, `DashboardCharts`; page has `periodToRange()` — presentation concern, fine | 3 |
| **QAdd** | Modal form; routes delegate to handler | 4 |
| **Credit** | `CreditHealthScore`, `CreditAccountCard`, `CreditActionsGrid`, `UtilizationTrendChart` | 4 |
| **AZEO** | `CreditLenderLens` — displays advisor output | 3 |
| **Notif** | `NotificationBell` — display only | 3 |
| **Profile** | `SettingsView`, section components; routes delegate | 4 |
| **Export** | `ExportButton`; route contains `escapeCSV()` + `buildCSV()` inline — formatting logic, borderline acceptable | 3 |

## Business Logic Layer (Handlers, Lib)

| Domain | What exists | CMM |
|--------|------------|-----|
| **Sync** | `handlers/sync.ts` — orchestrates daily + historical; quota guard; `lib/simplefin/client.ts`, `transform.ts` | 4 |
| **Cat** | `lib/categorization/engine.ts` (pure), `defaultRules.ts`, `troveMapping.ts`; `handlers/troveEnrich.ts` | 5 |
| **Xfer** | `lib/classifyTransfer.ts`, `lib/detectPairedTransfers.ts` — pure functions | 5 |
| **Bills** | `handlers/bills.ts` — validation + CRUD orchestration; `handlers/payments.ts` | 4 |
| **Subs** | `lib/subscriptions/detect.ts`, `classify.ts`, `normalize.ts`, `autoMatch.ts`; `handlers/subscriptions.ts` | 5 |
| **AutoPay** | `handlers/autoPayDetect.ts` — matching + price-increase detection | 4 |
| **Budget** | `lib/budget/engine.ts` (pure computations), `rollover.ts`, `dedup.ts`; `handlers/budgets.ts` | 5 |
| **CFlow** | `lib/cashFlow.ts` — pure functions: `computeCashFlow`, `computeCashFlowSimple`, `spreadAmortized`, `bucketByMonth` | 4 |
| **QAdd** | `handlers/quickAdd.ts` — validation | 4 |
| **Credit** | `handlers/credit.ts` — score computation, utilization calculations | 4 |
| **AZEO** | `handlers/creditAdvisor.ts` — anchor card strategy, payment plans | 4 |
| **Notif** | `handlers/notifications.ts` (dispatch + cooldown), `notificationDigest.ts`; `lib/discord/webhook.ts`, `embeds.ts` | 4 |
| **Profile** | `handlers/userProfile.ts` — validation | 4 |
| **Export** | **Missing** — no handler; CSV logic inline in API route | 2 |

## Data Layer (Adapters)

| Domain | What exists | CMM |
|--------|------------|-----|
| **Sync** | `adapters/syncLog.ts` — pure CRUD | 4 |
| **Cat** | `adapters/categoryRules.ts` — pure CRUD; **but `categorize()` called inside `adapters/accounts.ts:upsertTransaction`** | 3 |
| **Xfer** | `adapters/accounts.ts:markTransfersById` — pure update | 4 |
| **Bills** | `adapters/bills.ts` — **creates payment record on isPaid transition (line 108)** — business rule in adapter | 3 |
| **Subs** | `adapters/subscriptions.ts` — dismiss tracking | 4 |
| **AutoPay** | Implicit — uses bills adapter | 3 |
| **Budget** | `adapters/budgets.ts`, `adapters/transactions.ts` — pure CRUD | 4 |
| **CFlow** | `adapters/accounts.ts` fetches data + delegates to `lib/cashFlow.ts`; `adapters/cashFlowHistory.ts` — same pattern | 4 |
| **QAdd** | `adapters/quickAdd.ts` — pure CRUD | 4 |
| **Credit** | `adapters/credit.ts`, `adapters/accountMeta.ts` — pure queries | 4 |
| **AZEO** | Uses `adapters/accountMeta.ts` | 4 |
| **Notif** | `adapters/notificationLog.ts` — pure CRUD | 4 |
| **Profile** | `adapters/userProfile.ts` — CRUD + defaults merge | 4 |
| **Export** | Implicit — uses accounts adapter | 3 |

## Infrastructure Layer (Scripts, CI, Cron)

| Domain | What exists | CMM |
|--------|------------|-----|
| **Sync** | `scripts/cron-sync.sh` + `scripts/cron-sync.ts` — delegates to handler; crontab configured | 4 |
| **Cat** | `scripts/queries/trove-enrich-all.ts` — batch enrichment script | 3 |
| **Xfer** | `scripts/queries/backfill-is-transfer.ts` — migration script | 3 |
| **Bills** | Missing — no bill-reset cron (monthly isPaid reset is manual) | 2 |
| **Subs** | Implicit — detection runs on-demand only | 2 |
| **AutoPay** | Implicit — fires from sync route, no standalone trigger | 2 |
| **Budget** | Rollover logic exists in lib but **no cron trigger for month-end rollover** | 2 |
| **CFlow** | Missing | 1 |
| **QAdd** | Missing — not needed | N/A |
| **Credit** | Missing — alerts fire from sync only | 2 |
| **AZEO** | Missing | 1 |
| **Notif** | Digest route exists but **no cron for daily digest** | 2 |
| **Profile** | Missing — not needed | N/A |
| **Export** | Missing — not needed | N/A |

---

## Concern Bleed List

| # | What | Where it is | Where it belongs | Severity |
|---|------|-------------|-----------------|----------|
| ~~**C1**~~ | ~~`getCashFlowThisMonth()` + `getCashFlowForRange()` — 75 lines of amortization, transfer classification, income/expense bucketing~~ | ~~`adapters/accounts.ts:79–154`~~ | ~~`lib/cashFlow.ts` or `handlers/cashFlow.ts`~~ | ~~**FIXED**~~ |
| ~~**C2**~~ | ~~`getCashFlowHistory()` — 77 lines duplicating the same amortization + bucketing pattern~~ | ~~`adapters/cashFlowHistory.ts:12–77`~~ | ~~`lib/cashFlow.ts` (shared with C1)~~ | ~~**FIXED**~~ |
| ~~**C3**~~ | ~~`isTransfer()` — hardcoded transfer keywords, diverges from canonical `classifyTransfer.ts`~~ | ~~`app/api/v1/summary/route.ts:5–13`~~ | ~~Should use `classifyTransfer` or stored `isTransfer` field~~ | ~~**FIXED**~~ |
| **C4** | `categorize()` called during `upsertTransaction()` | `adapters/accounts.ts:23–25` | `handlers/sync.ts` (pre-categorize before passing to adapter) | **MEDIUM** |
| **C5** | Payment record creation on `isPaid` transition | `adapters/bills.ts:108–114` | `handlers/bills.ts` (after update confirmation) | **LOW** |
| **C6** | `escapeCSV()` + `buildCSV()` inline in API route | `app/api/v1/export/route.ts:7–34` | `lib/export.ts` or `handlers/export.ts` | **LOW** |
| **C7** | Onboarding step computation inline in API route | `app/api/v1/onboarding/route.ts:33–38` | `handlers/onboarding.ts` | **LOW** |

---

## Priority Actions (P1–P5)

### P1. Extract cash flow engine

**Files:** `adapters/accounts.ts:79–154`, `adapters/cashFlowHistory.ts`

Two files contain ~150 lines of duplicated business logic (amortization spreading, transfer exclusion, income/expense splitting) trapped in the data layer. Every domain that consumes cash flow (Budget, Dashboard, Notifications) inherits this coupling. The amortization algorithm is untestable without a live DB, and any bug fix must be applied in two places.

**Action:** Extract to `lib/cashFlow.ts`, test with pure functions, and have both adapters + the summary route call it.

### P2. Replace divergent `isTransfer()` in summary route

**File:** `app/api/v1/summary/route.ts:5–13`

The summary route uses a hardcoded keyword list that is out of sync with the canonical `classifyTransfer.ts` (missing credit-card-payment detection, missing `TRANSFER_OWNER_NAME` Zelle filtering, missing the stored `isTransfer` field). This means the summary endpoint reports **different income/expense numbers** than the dashboard.

**Action:** Use the stored `isTransfer` field, fall back to `classifyTransfer()`.

### P3. Hoist categorization out of `upsertTransaction`

**File:** `adapters/accounts.ts:15–25`

The adapter imports and calls the categorization engine, creating a hard dependency from the data layer to business logic. You can't upsert a transaction without triggering categorization — blocking future use cases like bulk import, migration, or re-sync where categorization should run separately.

**Action:** Move categorization to the sync handler (which already hoists `listCategoryRules`), pass a fully-categorized transaction to the adapter.

### P4. Move payment creation out of bills adapter

**File:** `adapters/bills.ts:108–114`

The `updateBill` adapter creates a payment record as a side effect of flipping `isPaid`. This is a business rule (false-to-true transition triggers payment logging) hidden inside what looks like a CRUD function. Any caller of `updateBill` gets this behavior whether they want it or not.

**Action:** Move to `handlers/bills.ts` after the update call.

### P5. Add cron triggers for budget rollover + notification digest

**Files:** `lib/budget/rollover.ts`, `handlers/notificationDigest.ts`

Both modules have complete logic but no infrastructure trigger. Budget rollover only fires if a user visits the budget page after month-end. The daily digest never sends unless manually hit via API. These are time-sensitive operations that silently fail to run.

**Action:** Add two crontab entries pointing at small wrapper scripts modeled on `cron-sync.sh`.
