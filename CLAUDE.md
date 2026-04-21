# CLAUDE.md — Project Instructions

---

## Session Checklist

Before starting any feature work, start the GitHub Actions runner:

```bash
cd ~/projects/bill-tracker/actions-runner && nohup ./run.sh > ~/runner.log 2>&1 &
```

---

## Quick Reference — Scripts

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start dev server on port 3000 |
| `pnpm build` | Build for production |
| `pnpm start` | Run production build |
| `pnpm typecheck` | TypeScript type-check only |
| `pnpm test` | Run ALL tests (unit + E2E) |
| `pnpm test:unit` | Unit/integration tests (Vitest) |
| `pnpm test:unit:watch` | Unit tests in watch mode |
| `pnpm test:coverage` | Unit tests with coverage |
| `pnpm test:e2e` | E2E tests (kills test ports first) |
| `pnpm test:e2e:ui` | E2E with Playwright UI |
| `pnpm test:kill-ports` | Kill test ports (4000, 4010, 4020) |
| `pnpm db:query <name>` | Run a dev/test database query |
| `pnpm db:query:list` | List all registered queries |

---

## Critical Rules

### 0. NEVER Publish Sensitive Data

- NEVER commit passwords, API keys, tokens, or secrets to git/npm/docker
- NEVER commit `.env` files — ALWAYS verify `.env` is in `.gitignore`
- Before ANY commit: verify no secrets are included

### 1. TypeScript Always

- ALWAYS use TypeScript for new files (strict mode)
- NEVER use `any` unless absolutely necessary and documented why

### 2. API Versioning

Every API endpoint MUST use `/api/v1/` prefix. No exceptions.

```
CORRECT: /api/v1/users
WRONG:   /api/users
```

### 3. Database Access — StrictDB

**ALL database access uses StrictDB directly. No exceptions.**

- NEVER import native database drivers (`mongodb`, `pg`, etc.) directly
- Share a single StrictDB instance via `getDb()` from `src/adapters/db.ts`
- All query inputs are automatically sanitized against injection

**Test queries go through `scripts/db-query.ts`:**
1. Create a query file in `scripts/queries/<name>.ts`
2. Register it in `scripts/db-query.ts`
3. NEVER create standalone scripts or inline queries in `src/`

**StrictDB upsert calls require `upsert: true` as the 4th arg.** Both `upsertAccount` and `upsertTransaction` in `src/adapters/accounts.ts` need this — missing it silently drops new records.

### 4. Testing — Explicit Success Criteria

- ALWAYS define explicit success criteria for E2E tests
- "Page loads" is NOT a success criterion
- Every E2E test MUST verify: URL, visible elements, data displayed
- Minimum 3 assertions per test

### 5. NEVER Hardcode Credentials

- ALWAYS use environment variables for secrets
- NEVER put API keys, passwords, or tokens directly in code

### 6. ALWAYS Ask Before Deploying

- NEVER auto-deploy, even if the fix seems simple
- NEVER assume approval — wait for explicit "yes, deploy"

### 7. Quality Gates

- No file > 300 lines (split if larger)
- No function > 50 lines (extract helpers)
- All tests must pass before committing
- TypeScript must compile with no errors

### 8. Parallelize Independent Awaits

```typescript
// CORRECT
const [users, products] = await Promise.all([getUsers(), getProducts()]);

// WRONG
const users = await getUsers();
const products = await getProducts();
```

### 9. Git Workflow — NEVER Work Directly on Main

**ALWAYS branch BEFORE editing any files:**

```bash
git branch --show-current
# If on main → create a feature branch IMMEDIATELY:
git checkout -b feat/<task-name>
```

### 10. Server Pages — Direct DB Calls Only

Server pages MUST call adapters/handlers directly with `getDb()`. NEVER use internal `fetch()` from server components — the auth middleware blocks it and it adds 500–1000ms latency.

### 11. Cron — Absolute Paths Required

System cron runs with a bare PATH and won't find nvm binaries. Always use full paths:
```
/home/garci/.nvm/versions/node/v24.14.1/bin/npx tsx scripts/cron-sync.ts
```

### 12. UI Changes — Mock Before Implementing

For significant UI/layout changes, mock up in Claude Artifacts (claude.ai) first. Get visual approval before writing code.

**Do NOT re-apply ocean/depth/teal theme** — user rejected it. Keep: zinc/blue/white dark mode palette with IBM Plex Mono, `--bg #0a0a0a` CSS vars.

---

## Service Ports (FIXED — NEVER CHANGE)

| Service | Dev Port | Test Port |
|---------|----------|-----------|
| Website | 3000 | 4000 |
| API | 3001 | 4010 |
| Dashboard | 3002 | 4020 |

Before starting services, kill existing processes:
```bash
lsof -ti:3000,3001,3002 | xargs kill -9 2>/dev/null
```

---

## When Something Seems Wrong

- Missing UI element? → Check feature gates BEFORE assuming bug
- Empty data? → Check if services are running BEFORE assuming broken
- 404 error? → Check service separation BEFORE adding endpoint
- Auth failing? → Check which auth system BEFORE debugging
- Test failing? → Read the error message fully BEFORE changing code

---

## Project Documentation

| Document | Purpose | When to Read |
|----------|---------|--------------|
| `project-docs/ARCHITECTURE.md` | System overview & data flow | Before architectural changes |
| `project-docs/INFRASTRUCTURE.md` | Deployment details | Before environment changes |
| `project-docs/DECISIONS.md` | Architectural decisions | Before proposing alternatives |

---

## Workflow Preferences

- Quality over speed — if unsure, ask before executing
- Plan first, code second — use plan mode for non-trivial tasks
- One task, one chat — `/clear` between unrelated tasks
- When testing: queue observations, fix in batch (not one at a time)

---

## Naming — NEVER Rename Mid-Project

If you must rename packages, modules, or key variables:
1. Create a checklist of ALL files and references first
2. Use IDE semantic rename (not search-and-replace)
3. Full project search for old name after renaming
4. Check: .md files, .env files, comments, strings, paths
5. Start a FRESH Claude session after renaming

---

## Plan Mode — Named Steps Required

Every step in a plan MUST have a unique name (e.g. `Step 3 (Auth System)`). When modifying a plan, REPLACE that step's content — never append. Output the full updated plan so contradictions are visible.

---

## SimpleFIN — Known Gotchas

- **Credentials:** sent as `Authorization: Basic` header (`src/lib/simplefin/client.ts`)
- **Upsert calls:** both `upsertAccount` and `upsertTransaction` require `upsert: true` as 4th arg — missing it silently drops records
- **Fallbacks:** `inferOrgName()` + `inferAccountType()` in `src/lib/simplefin/transform.ts` handle banks that don't send type/org
- **Quota:** 24 requests/day max. Cron runs every 2h = 12/day. Historical import = 3 requests (runs once via `historicalImportDone` flag). Guard: `SIMPLEFIN_QUOTA_GUARD=20`

---

## Cash Flow — Transfer Detection

`isTransfer()` helper in `src/adapters/cashFlowHistory.ts` and `src/adapters/accounts.ts` excludes:
1. Positive amounts on `type: credit` accounts (debt payments, not income)
2. Descriptions matching `^(deposit from|transfer from|transfer to|online transfer|account transfer)`
3. Self-Zelle when `TRANSFER_OWNER_NAME` env var is set

Add `TRANSFER_OWNER_NAME=<your full name>` to `.env` to filter self-Zelle from cash flow totals.

---

## Auth

NextAuth v5 credentials provider. Required in `.env`:
- `AUTH_SECRET` — run `npx auth secret` to generate
- `AUTH_PASSWORD` — your chosen login password

---

## CI/CD

- GitHub Actions workflow: `.github/workflows/ci.yml` — runs on push/PR to `master`
- Self-hosted runner: `~/actions-runner/run.sh` — must be running for CI to pick up jobs
- Pipeline: typecheck → unit tests → E2E (Chromium only) → failure summary
- E2E uses local MongoDB (`mongodb://localhost:27017/bill-tracker`)
- Monitor: `gh run watch`

---

## Feature Status (as of 2026-04-20)

All features below are built and merged to master:

| Feature | Notes |
|---------|-------|
| Monthly Summary | |
| Payment History | |
| SimpleFIN Core Sync | |
| Budget & Alerts | |
| Credit Health Module | |
| Discord Notifications | |
| Subscription Detection | |
| Credit Optimizer (AZEO) | Statement close alerts, utilization spike alerts, `accountMeta` collection |
| Sync Button + Auto-Sync | `idle/syncing/done/error/quota` states; startup auto-sync if >2h since last |
| Full Transaction History | Pagination, account/date filters, tags, notes, category badge |
| Loading Skeletons + Prefetch | All routes have `loading.tsx`; Sidebar prefetches all routes on mount |
| Unknown Account Alerts | Amber dot in Sidebar + banner in Settings when `orgName === 'Unknown'` |
| Dashboard Charts | `DashboardCharts.tsx` — Chart.js TrendChart, GroupedBar, CategoryDoughnut |
| Period Selector | `PeriodSelector.tsx` — 1W/1M/3M/YTD/1Y via `?p=` search param |
| Auto-Categorization | Engine + inline badge; 280+ rules in `defaultRules.ts`; bulk recategorize endpoint |
| Manual Tags + Notes | Inline editor; `TagsRow` hidden by default, shows on hover |
| CSV Export | OWASP injection guard (`escapeCSV`); reads current filter state |
| Onboarding Wizard | 4-step banner; hides when complete |
| Auth | NextAuth credentials + middleware |
| Category Rules UI | Add/delete custom rules in Settings |
| Dashboard UI Redesign | Pure dark mode, IBM Plex Mono, CSS vars, `--bg #0a0a0a` |
| Cash Flow Transfer Detection | `isTransfer()` helper, `TRANSFER_OWNER_NAME` env var |
| Dashboard 3-col layout | `SpendByCategoryCard` + Budget + Recent Payments |
| RecurringView | Filter tabs (ALL/UNPAID/PAID/AUTOPAY) + sticky header Add Bill button |
| Recategorize endpoint | `POST /api/v1/transactions/recategorize` — bulk backfill |

**Current test totals: 310 unit tests (passing). All E2E green.**

---

## Next Session Ideas

- **Runner auto-start** — configure as systemd/WSL background service
- **Production deployment** — MongoDB Atlas (free tier) is set up; Dokploy config in `.env.example`
- **Transfer UI** — allow manually marking transactions as "transfer" (would catch edge cases the env-var heuristic misses)

---

## Known Pre-Launch Gaps

- Runner must be manually started each session (see Session Checklist above)
- Add `TRANSFER_OWNER_NAME=<your name>` to `.env` for self-Zelle filtering
- Auth requires `AUTH_SECRET` + `AUTH_PASSWORD` in `.env`
