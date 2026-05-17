# Architecture

## Overview

Folio is a single Next.js 15 (App Router) application that serves both the UI and the API from one process. It is deployed as a Docker container and connects to a MongoDB database (local or Atlas).

```
Browser
  └── Next.js App (port 3000)
        ├── App Router pages  (src/app/)
        ├── API routes        (src/app/api/v1/)
        ├── Handlers          (src/handlers/)   ← business logic
        ├── Adapters          (src/adapters/)   ← DB access via StrictDB
        └── Lib               (src/lib/)        ← pure utilities

External services (all optional):
  SimpleFIN bridge  ← bank account / transaction sync
  Trove API         ← transaction categorization enrichment
  Discord           ← bill-due notifications
  Upstash Redis     ← login rate limiting
```

## Key Layers

### Pages (`src/app/`)
Server components that call adapters directly via `getDb()`. Never use internal `fetch()` from server components — the auth middleware would block it and it adds latency.

### API Routes (`src/app/api/v1/`)
Thin route handlers: parse the request, call a handler, return JSON. All routes require a valid NextAuth session (enforced by `src/middleware.ts`). The `/api/v1/health` endpoint is public.

### Handlers (`src/handlers/`)
Business logic — orchestrate multiple adapters, apply rules, call external services. Handlers do not import `next/server` or touch HTTP concerns.

### Adapters (`src/adapters/`)
All MongoDB access goes through StrictDB via the shared singleton in `src/adapters/db.ts`. Never import `mongodb` directly in application code.

### Auth (`src/auth.ts`, `src/middleware.ts`)
NextAuth v5 credentials provider. Middleware guards every route except NextAuth internals, static assets, and the health endpoint. Demo mode (`user.name === 'Demo'`) is read-only.

## Data Flow — Bank Sync

```
Cron (every 2h) or manual trigger
  → POST /api/v1/sync
  → src/handlers/sync.ts
  → SimpleFINClient.fetchAccounts()     (SimpleFIN bridge)
  → upsertAccount() × N                 (MongoDB: accounts)
  → upsertTransaction() × N             (MongoDB: transactions)
    └── categorize()                    (keyword rules)
    └── troveEnrich() (async)           (Trove API → category override)
  → updateSyncLog()                     (MongoDB: syncLog)
```

## Data Flow — Bill Notifications

```
Cron (daily) or manual trigger
  → src/handlers/notificationDigest.ts
  → listBillsDueSoon()
  → Discord webhook
```

## Data Flow — Goals Sync

```
Bank sync (daily/manual/historical)
  → src/handlers/sync.ts (post-sync hook)
  → src/handlers/goalSync.ts
  → listLinkedGoals()               (goals with linkedAccountId)
  → match account balance from latest sync
  → updateGoalSavedAmount()         (MongoDB: goals)
```

## Data Flow — Bill isPaid Lifecycle (CMM Stage 3 — Infrastructure)

```
Month-end rollover (cron-budget-rollover.ts)
  → applyMonthEndRollover(db, month)
  → [budget rollover logic]
  → db.updateMany('bills', { isRecurring: true }, { $set: { isPaid: false } })

Display layer (all pages with serializeBill)
  → isPaidThisMonth(bill): isPaid && paidMonth === currentYYYYMM()
  → Recurring bills only show as paid when paidMonth matches current month
```

## Data Flow — Auto-Pay Detection (CMM Stage 3 — Infrastructure, Stage 4 — Business Logic)

```
Cron (every 2h) or manual sync
  → scripts/cron-sync.ts / POST /api/v1/sync
  → runDailySync()                        (transactions imported)
  → detectAutoPayments(db)                (awaited in cron, fire-and-forget in HTTP)
    → listBills() → filter unpaid recurring bills for current month
    → query transactions (negative, non-pending, posted this month)
    → findBestMatch() per bill:
        1. paymentDescriptionHint match (confidence: 'hint')
        2. longest word (≥4 chars) from bill name (confidence: 'name')
        3. ±30% amount tolerance gate
    → updateBill(isPaid: true) + createPayment() + lastChargedAmount stamp
```

## Data Flow — Cash Flow Forecast (CMM Stage 3 — Cross-Domain)

```
Dashboard page load (server component)
  → src/adapters/forecast.ts
  → listAccounts()                   (current balances)
  → listBills()                      (recurring due dates + amounts)
  → listTransactionsForDetection()   (90-day transaction window)
  → detectSubscriptions()            (recurring expense patterns)
  → detectIncomePatterns()           (recurring income/paycheck detection)
  → buildForecast()                  (90-day daily balance projection)
  → ForecastChart                    (Chart.js line chart on dashboard)
```

Cross-domain: combines accounts (balances), bills (due dates), subscriptions (detected patterns), and transactions (income detection) into a single forward-looking projection. Income detection reuses the subscription detection algorithm from `src/lib/subscriptions/detect.ts` (same `INTERVAL_WINDOWS`, normalization, and grouping) but filters for positive non-transfer amounts.

## Collections (MongoDB)

| Collection | Description |
|------------|-------------|
| `accounts` | Bank account records from SimpleFIN |
| `transactions` | Individual transactions |
| `bills` | Recurring bill definitions |
| `payments` | Payment history records |
| `budgets` | Monthly budget limits by category |
| `syncLog` | Daily sync metadata and quota tracking |
| `accountMeta` | Credit account settings (limit, utilization target) |
| `goals` | Savings goals with optional linked-account auto-sync |
| `categoryRules` | User-defined keyword → category rules |
| `notificationLogs` | Sent notification history |
| `_migrations` | Applied DB migration tracking |

## Security Headers

Set in `next.config.ts`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security` (production only)

## SimpleFIN Field Utilization

### Tier 1 — Captured (implemented)

| Field | Object | What it powers |
|-------|--------|---------------|
| `cost-basis` | Holding | Unrealized gain/loss per holding and total portfolio return in PortfolioWidget |
| `quantity` | Holding | Per-holding share count displayed in PortfolioWidget |
| `purchased-at` | Holding | Stored as `purchasedAt` on Holding for future holding-period tracking |
| `extra.category` | Transaction | Extracted as `bridgeCategory` — used as last-resort fallback in categorization engine (after user rules, keyword rules, and Trove) |
| `conn_id` | Account | Stored as `connectionId` — powers institution grouping in NetWorthCard, org-name propagation for Unknown accounts, and per-connection error reporting |
| `Connection` object | Top-level (AccountSet) | `RawSFINConnection` type with `conn_id`, `name`, `org_id`, `org_url`, `sfin_url`. `org_url` is stored as `orgUrl` on Account for favicon rendering |
| `org_url` | Connection | Stored as `orgUrl` on Account — renders institution favicon via `{orgUrl}/favicon.ico` in NetWorthCard |
| `errlist` | AccountSet | Preferred over deprecated `errors` array — provides per-connection error reporting via `conn_id`. Falls back to `errors` when `errlist` is absent |

### Tier 2 — Backlog (typed but not yet surfaced)

| Field | Object | Potential use |
|-------|--------|--------------|
| `org.sfin-url` | Organization | Could link to institution's SimpleFIN server for connection diagnostics |
| `org_id` | Connection | Stable institution ID for grouping accounts across multiple connections (typed in `RawSFINConnection` but not yet stored on Account) |
| `account.extra` | Account | Stored in MongoDB but never queried — contains `account-open-date` (credit age calculation) and other institution-specific metadata |
| `transaction.extra` | Transaction | Stored but only `pending` and `category` are extracted — may contain institution-specific fields worth surfacing |

## Service Ports

| Service | Dev | Test |
|---------|-----|------|
| App | 3000 | 4000 |
| (reserved) API | 3001 | 4010 |
| (reserved) Dashboard | 3002 | 4020 |
