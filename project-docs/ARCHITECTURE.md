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

## Service Ports

| Service | Dev | Test |
|---------|-----|------|
| App | 3000 | 4000 |
| (reserved) API | 3001 | 4010 |
| (reserved) Dashboard | 3002 | 4020 |
