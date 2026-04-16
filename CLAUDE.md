# CLAUDE.md — Project Instructions

---

## Session Checklist

Before starting any feature work, start the GitHub Actions runner so CI picks up pushes:

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
| **Testing** | |
| `pnpm test` | Run ALL tests (unit + E2E) |
| `pnpm test:unit` | Unit/integration tests (Vitest) |
| `pnpm test:unit:watch` | Unit tests in watch mode |
| `pnpm test:coverage` | Unit tests with coverage |
| `pnpm test:e2e` | E2E tests (kills test ports first) |
| `pnpm test:e2e:ui` | E2E with Playwright UI |
| `pnpm test:e2e:headed` | E2E with visible browser |
| `pnpm test:kill-ports` | Kill test ports (4000, 4010, 4020) |
| **Database** | |
| `pnpm db:query <name>` | Run a dev/test database query |
| `pnpm db:query:list` | List all registered queries |

---

## Critical Rules

### 0. NEVER Publish Sensitive Data

- NEVER commit passwords, API keys, tokens, or secrets to git/npm/docker
- NEVER commit `.env` files — ALWAYS verify `.env` is in `.gitignore`
- Before ANY commit: verify no secrets are included
- NEVER output secrets in suggestions, logs, or responses

### 1. TypeScript Always

- ALWAYS use TypeScript for new files (strict mode)
- NEVER use `any` unless absolutely necessary and documented why
- When editing JavaScript files, convert to TypeScript first
- Types are specs — they tell you what functions accept and return

### 2. API Versioning

```
CORRECT: /api/v1/users
WRONG:   /api/users
```

Every API endpoint MUST use `/api/v1/` prefix. No exceptions.

### 3. Database Access — StrictDB

**ALL database access uses StrictDB directly. No exceptions.**

- Install `strictdb` + your driver, use `StrictDB.create()` at app startup
- NEVER import native database drivers (`mongodb`, `pg`, etc.) directly
- Share a single StrictDB instance across the application
- All query inputs are automatically sanitized against injection

**Test queries go through `scripts/db-query.ts`:**
1. Create a query file in `scripts/queries/<name>.ts`
2. Register it in `scripts/db-query.ts`
3. NEVER create standalone scripts or inline queries in `src/`

### 4. Testing — Explicit Success Criteria

- ALWAYS define explicit success criteria for E2E tests
- "Page loads" is NOT a success criterion
- Every E2E test MUST verify: URL, visible elements, data displayed
- Minimum 3 assertions per test

```typescript
// CORRECT
await expect(page).toHaveURL('/dashboard');
await expect(page.locator('h1')).toContainText('Welcome');
await expect(page.locator('[data-testid="user"]')).toContainText('test@example.com');

// WRONG — no assertions
await page.goto('/dashboard');
```

### 5. NEVER Hardcode Credentials

- ALWAYS use environment variables for secrets
- NEVER put API keys, passwords, or tokens directly in code
- NEVER hardcode connection strings — use environment variables from .env

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
// CORRECT — independent operations in parallel
const [users, products] = await Promise.all([getUsers(), getProducts()]);

// WRONG — sequential when independent
const users = await getUsers();
const products = await getProducts();
```

### 9. Git Workflow — NEVER Work Directly on Main

**Auto-branch hook is ON by default.** ALWAYS branch BEFORE editing any files:

```bash
git branch --show-current
# If on main → create a feature branch IMMEDIATELY:
git checkout -b feat/<task-name>
```

### 10. Docker Push Gate

When enabled, ANY `docker push` is BLOCKED until the image passes local verification.

---

## Service Ports (FIXED)

| Service | Dev Port | Test Port |
|---------|----------|-----------|
| Website | 3000 | 4000 |
| API | 3001 | 4010 |
| Dashboard | 3002 | 4020 |

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

**ALWAYS read relevant docs before making cross-service changes.**

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
4. Check: .md files, .txt files, .env files, comments, strings, paths
5. Start a FRESH Claude session after renaming

## Featured Packages

Open-source packages by [TheDecipherist](https://github.com/TheDecipherist) (the developer of this starter kit) are integrated into project profiles. All are MIT-licensed.

### ClassMCP (MCP Server) — Semantic CSS for AI

Provides semantic CSS class patterns to Claude via MCP, reducing token usage when working with styles. Auto-included in CSS-enabled profiles (`mcp` field in `claude-mastery-project.conf`).

```bash
claude mcp add classmcp -- npx -y classmcp@latest
```

npm: [classmcp](https://www.npmjs.com/package/classmcp)

### Classpresso — Post-Build CSS Optimization

Consolidates CSS classes after build for 50% faster style recalculation with zero runtime overhead. Auto-included as a devDependency in CSS-enabled profiles; runs via `pnpm build:optimize` (also auto-runs as `postbuild`).

```bash
pnpm add -D classpresso
```

npm: [classpresso](https://www.npmjs.com/package/classpresso)

### StrictDB-MCP (MCP Server) — Database Access for AI

Gives AI agents direct database access through 14 MCP tools with full guardrails, sanitization, and error handling. Auto-included in database-enabled profiles (`mcp` field in `claude-mastery-project.conf`).

```bash
claude mcp add strictdb -- npx -y strictdb-mcp@latest
```

npm: [strictdb-mcp](https://www.npmjs.com/package/strictdb-mcp)

### TerseJSON (Optional) — Memory-Efficient JSON

Proxy-based lazy JSON expansion achieving ~70% memory reduction. **Not auto-included** — install only if your project handles large JSON payloads.

```bash
pnpm add tersejson
```

npm: [tersejson](https://www.npmjs.com/package/tersejson)

---


## Windows Users — Use VS Code in WSL Mode

If you're on Windows, you should be running VS Code in **WSL 2 mode**. Most people don't know this exists and it dramatically changes everything:

- **HMR is 5-10x faster** — file changes don't cross the Windows/Linux boundary
- **Playwright tests run significantly faster** — native Linux browser processes
- **File watching actually works** — `tsx watch`, `next dev`, `nodemon` are all reliable
- **Node.js filesystem operations** avoid the slow NTFS translation layer
- **Claude Code runs faster** — native Linux tools (`grep`, `find`, `git`)

**CRITICAL:** Your project must be on the **WSL filesystem** (`~/projects/`), NOT on `/mnt/c/`. Having WSL but keeping your project on the Windows filesystem gives you the worst of both worlds.

```bash
# Check if you're set up correctly:
pwd
# GOOD: /home/you/projects/my-app
# BAD:  /mnt/c/Users/you/projects/my-app  ← still hitting Windows filesystem

# VS Code: click green "><" icon bottom-left → "Connect to WSL"
```

Run `/setup` to auto-detect your environment and get specific instructions.

---


## Service Ports (FIXED — NEVER CHANGE)

| Service | Dev Port | Test Port | URL |
|---------|----------|-----------|-----|
| Website | 3000 | 4000 | http://localhost:{port} |
| API | 3001 | 4010 | http://localhost:{port} |
| Dashboard | 3002 | 4020 | http://localhost:{port} |

When starting any service, ALWAYS use its assigned port:

```bash
# CORRECT
npx next dev -p 3002

# WRONG — never let it default
npx next dev
```

Before starting services, ALWAYS kill existing processes on those ports:

```bash
lsof -ti:3000,3001,3002 | xargs kill -9 2>/dev/null
```

---


## Project Structure

```
project/
├── CLAUDE.md              # You are here
├── CLAUDE.local.md        # Personal overrides (gitignored)
├── .claude/
│   ├── commands/          # Slash commands (/review, /refactor, /worktree, /new-project, etc.)
│   ├── skills/            # Triggered expertise & scaffolding templates
│   ├── agents/            # Custom subagents
│   └── hooks/             # Enforcement scripts (9 hooks: secrets, branch, ports, rybbit, e2e, lint, env-sync, rulecatch)
├── project-docs/
│   ├── ARCHITECTURE.md    # System overview & data flow
│   ├── INFRASTRUCTURE.md  # Deployment & environment details
│   └── DECISIONS.md       # Why we chose X over Y
├── docs/                  # GitHub Pages site
│   └── user-guide.html   # Interactive User Guide (HTML)
├── src/
│   ├── handlers/          # Business logic
│   ├── adapters/          # External service wrappers
│   └── types/             # Shared TypeScript types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/
│   ├── db-query.ts        # Test Query Master — index of all dev/test queries
│   ├── queries/           # Individual query files (dev/test only, NOT production)
│   ├── build-content.ts   # Markdown → HTML article builder
│   └── content.config.json # Article registry (source, output, SEO metadata)
├── content/               # Markdown source files for articles/posts
├── USER_GUIDE.md          # Comprehensive User Guide (Markdown)
├── .env.example           # Template with placeholders (committed)
├── .env                   # Actual secrets (NEVER committed)
├── .gitignore
├── .dockerignore
├── package.json           # All scripts: dev, test, db:query, content:build, ai:monitor
├── claude-mastery-project.conf # Profile presets for /new-project (clean, default, api, go, etc.)
├── playwright.config.ts   # E2E test config (test ports 4000/4010/4020, webServer)
├── vitest.config.ts       # Unit/integration test config
└── tsconfig.json
```

---


## Coding Standards

### Imports

```typescript
// CORRECT — explicit, typed
import { getUserById } from './handlers/users.js';
import type { User } from './types/index.js';

// WRONG — barrel imports that pull everything
import * as everything from './index.js';
```

### Error Handling

```typescript
// CORRECT — handle errors explicitly
try {
  const user = await getUserById(id);
  if (!user) throw new NotFoundError('User not found');
  return user;
} catch (err) {
  logger.error('Failed to get user', { id, error: err });
  throw err;
}

// WRONG — swallow errors silently
try {
  return await getUserById(id);
} catch {
  return null; // silent failure
}
```

### Go (Gin / Chi / Echo / Fiber / stdlib)

When working on a Go project (detected by `go.mod` in root or `language = go` in profile):

- **Standard layout:** `cmd/` for entry points, `internal/` for private packages — follow Go conventions
- **Go modules:** Always use `go.mod` / `go.sum` — NEVER use `GOPATH` mode or `dep`
- **golangci-lint:** Run `golangci-lint run` before committing — config in `.golangci.yml`
- **Table-driven tests:** Use `[]struct{ name string; ... }` pattern for multiple test cases
- **context.Context:** Every I/O function accepts `ctx context.Context` as first parameter
- **Interfaces:** Accept interfaces, return structs — define interfaces at the consumer
- **Error handling:** NEVER ignore errors with `_` — always check and wrap with `fmt.Errorf("context: %w", err)`
- **No global mutable state:** Pass dependencies via struct fields, not package-level vars
- **Graceful shutdown:** Handle SIGINT/SIGTERM, close DB connections with `context.WithTimeout`
- **API versioning:** Same rule — all endpoints under `/api/v1/` prefix
- **Quality gates:** Same limits — no file > 300 lines, no function > 50 lines
- **Makefile:** Use `make build`, `make test`, `make lint` — NOT raw `go` commands in scripts

### Python (FastAPI / Django / Flask)

When working on a Python project (detected by `pyproject.toml` in root or `language = python` in profile):

- **Type hints ALWAYS:** Every function MUST have type hints for all parameters AND return type
- **Modern syntax:** Use `str | None` (not `Optional[str]`), `list[str]` (not `List[str]`)
- **Async consistently:** FastAPI handlers must be `async def` for I/O operations
- **pytest only:** NEVER use unittest — use pytest with `@pytest.mark.parametrize` for table-driven tests
- **Virtual environment:** ALWAYS use `.venv/` — NEVER install packages globally
- **Pydantic models:** Use Pydantic `BaseModel` for all request/response schemas
- **Pydantic settings:** Use `pydantic-settings` `BaseSettings` for environment config
- **ruff:** Run `ruff check` before committing — config in `ruff.toml` or `pyproject.toml`
- **API versioning:** Same rule — all endpoints under `/api/v1/` prefix
- **Quality gates:** Same limits — no file > 300 lines, no function > 50 lines
- **Makefile:** Use `make dev`, `make test`, `make lint` — NOT raw Python commands in scripts
- **Graceful shutdown:** Handle SIGINT/SIGTERM, close database connections before exiting

---


## Plan Mode — Plan First, Code Second

**For any non-trivial task, start in plan mode.** Don't let Claude write code until you've agreed on the plan. Bad plan = bad code. Always.

- Use plan mode for: new features, refactors, architectural changes, multi-file edits
- Skip plan mode for: typo fixes, single-line changes, obvious bugs
- One Claude writes the plan. You review it as the engineer. THEN code.

### Step Naming — MANDATORY

Every step in a plan MUST have a consistent, unique name. This is how the user references steps when requesting changes. Claude forgets to update plans — named steps make it unambiguous.

```
CORRECT — named steps the user can reference:
  Step 1 (Project Setup): Initialize repo with TypeScript
  Step 2 (Database Layer): Set up StrictDB
  Step 3 (Auth System): Implement JWT authentication
  Step 4 (API Routes): Create user endpoints
  Step 5 (Testing): Write E2E tests for auth flow

WRONG — generic steps nobody can reference:
  Step 1: Set things up
  Step 2: Build the backend
  Step 3: Add tests
```

### Modifying a Plan — REPLACE, Don't Append

When the user asks to change something in the plan:

1. **FIND** the exact named step being changed
2. **REPLACE** that step's content entirely with the new approach
3. **Review ALL other steps** for contradictions with the change
4. **Rewrite the full updated plan** so the user can see the complete picture

```
CORRECT:
  User: "Change Step 3 (Auth System) to use session cookies instead of JWT"
  Claude: Replaces Step 3 content, checks Steps 4-5 for JWT references,
          outputs the FULL updated plan with Step 3 rewritten

WRONG:
  User: "Actually use session cookies instead"
  Claude: Appends "Also, use session cookies" at the bottom
          ← Step 3 still says JWT. Now the plan contradicts itself.
```

**Claude will forget to do this.** If you notice the plan has contradictions, tell Claude: "Rewrite the full plan — Step 3 and Step 7 contradict each other."

- If fundamentally changing direction: `/clear` → state requirements fresh

---


## Documentation Sync

When updating any feature, keep these locations in sync:

1. `README.md` (repository root)
2. `docs/index.html` (GitHub Pages site)
3. `project-docs/` (relevant documentation)
4. `CLAUDE.md` quick reference table (if adding commands/scripts)
5. `tests/STARTER-KIT-VERIFICATION.md` (if adding hooks/files)
6. Inline code comments
7. Test descriptions

If you update one, update ALL.

### Adding a New Command or Hook — MANDATORY Checklist

When creating a new `.claude/commands/*.md` or `.claude/hooks/*.sh`:

1. **README.md** — Update the command count, project structure tree, and add a description section
2. **docs/index.html** — Update the command count, project structure tree, and add a command card
3. **CLAUDE.md** — Add to the quick reference table (if user-facing)
4. **tests/STARTER-KIT-VERIFICATION.md** — Add verification checklist entry
5. **.claude/settings.json** — Wire up hooks (if adding a hook)

**This is NOT optional.** Every command/hook must appear in all five locations before the commit.

### Command Scope Classification

Every command has a `scope:` field in its YAML frontmatter:

- **`scope: project`** (16 commands) — Work inside any project. Copied to scaffolded projects by `/new-project`, `/convert-project-to-starter-kit`, and `/update-project`.
- **`scope: starter-kit`** (10 commands) — Kit management only. Never copied to scaffolded projects.

**Project commands:** `help`, `review`, `commit`, `progress`, `test-plan`, `architecture`, `security-check`, `optimize-docker`, `create-e2e`, `create-api`, `worktree`, `refactor`, `diagram`, `setup`, `what-is-my-ai-doing`, `show-user-guide`

**Starter-kit commands:** `new-project`, `update-project`, `convert-project-to-starter-kit`, `install-global`, `projects-created`, `remove-project`, `set-project-profile-default`, `add-project-setup`, `quickstart`, `add-feature`

When distributing commands (new-project, convert, update), **always filter by `scope: project`** in the source command's frontmatter. Skills, agents, hooks, and settings.json are copied in full regardless of scope.

---


## CLAUDE.md Is Team Memory — The Feedback Loop

Every time Claude makes a mistake, **add a rule to prevent it from happening again.**

This is the single most powerful pattern for improving Claude's behavior over time:

1. Claude makes a mistake (wrong pattern, bad assumption, missed edge case)
2. You fix the mistake
3. You tell Claude: "Update CLAUDE.md so you don't make that mistake again"
4. Claude adds a rule to this file
5. Mistake rates actually drop over time

**This file is checked into git. The whole team benefits from every lesson learned.**

Don't just fix bugs — fix the rules that allowed the bug. Every mistake is a missing rule.

**If RuleCatch is installed:** also add the rule as a custom RuleCatch rule so it's monitored automatically across all future sessions. CLAUDE.md rules are suggestions — RuleCatch enforces them.

---

## Feature Roadmap — Session Status (as of 2026-04-10)

Each session runs in an isolated git worktree. **Do NOT start a new session without reading this table first.**

### MDD Docs

| Doc | Feature | Branch | Status |
|-----|---------|--------|--------|
| `01-monthly-summary` | Monthly Summary | `feat/initial-setup` | ✅ Built |
| `02-payment-history` | Payment History | `feat/initial-setup` | ✅ Built |
| `03-simplefin-core-sync` | SimpleFIN Core Sync | `feat/simplefin-sync` | ✅ Built + Doc added |
| `04-budget-alerts` | Budget & Alerts | `feat/budget-alerts` | ✅ Built — doc missing |
| `05-credit-health` | Credit Health Module | `feat/session-3` | ✅ Built |
| `06-discord-notifications` | Discord Notifications | `feat/session-3` | ✅ Built |
| — | Transaction Subscription Detection | `feat/session-3` | ✅ Built — doc missing |
| `08-fico-advisor` | Credit Optimizer & Statement Alert | `feat/fico-advisor` | ✅ Built |
| — | Sync Button + Startup Auto-Sync | `feat/sync-button` | ✅ Built |
| — | Full Transaction History Page | `feat/sync-button` | ✅ Built |
| — | Loading Skeletons + Route Prefetch + Direct DB | `feat/page-revamp` | ✅ Built |
| — | Unknown Account Alerts (Sidebar + Settings) | `feat/page-revamp` | ✅ Built |
| — | Dashboard: CashFlowCard + SpendingChart | `feat/dashboard-overhaul` | ✅ Built |
| — | Auto-Categorization (engine + inline badge) | `feat/auto-categorization` | ✅ Built |
| — | Manual Tags + Notes (inline editor) | `feat/manual-tagging` | ✅ Built |
| — | CSV Export (with injection protection) | `feat/export-reports` | ✅ Built |
| — | Onboarding Wizard (4-step progress banner) | `feat/onboarding-flow` | ✅ Built |

### What Was Built — Audit Session (`feat/fico-advisor`, 2026-04-02)

**MDD Audit — 6 findings fixed:**
- **M1** — Removed dead `credit_utilization_alert` type (re-added when implemented)
- **M2** — `runDailyDigest` now wraps webhook in try/catch — no more HTTP 500 on transient failures
- **L1** — `SettingsView` now receives `dueSoonDays` from server component instead of reading wrong env var
- **L2/L3** — CLAUDE.md credit endpoint path and score model description corrected
- **L4** — `notifyTest` now has `isWebhookConfigured()` guard

**Critical sync bug fixed:**
- **`src/adapters/accounts.ts`** — `upsertTransaction` was missing `upsert: true` — new transactions were silently dropped on every sync. Fixed. Followed by `POST /api/v1/sync/historical` to backfill 225 transactions.

**Cron sync configured:**
- Every 2 hours: `0 */2 * * *` via `scripts/cron-sync.ts` (hits DB directly, no server needed)
- Cron auto-starts on WSL login via `~/.bashrc` + `/etc/sudoers.d/cron-start`
- `POST /api/v1/sync/historical` route added for manual backfill

**Credit Optimizer & Statement Alert (`08-fico-advisor`):**
- AZEO strategy advisor on `/credit` page — shows per-card paydown targets, anchor card, projected score
- 30-day utilization trend chart (pure SVG, no dependencies), reconstructed from transaction history
- Statement close alerts — Discord fires X days before close with exact paydown to hit 5% target
- Utilization spike alerts — Discord fires after sync if any card > 70%
- Settings page: per-card statement closing day + target utilization inputs
- `POST /api/v1/credit/settings` + `GET /api/v1/credit/settings` + `GET /api/v1/credit/advisor`
- `accountMeta` collection — stores statement closing day + target utilization per card
- Both alerts use 24h cooldown, fire automatically after every sync

### SimpleFIN Live Connection — Known Fixes Applied

- **`src/lib/simplefin/client.ts`** — credentials sent as `Authorization: Basic` header
- **`src/adapters/accounts.ts`** — `upsertAccount` and `upsertTransaction` both require `upsert: true` (4th arg). **Always verify this when adding new upsert calls.**
- **`src/lib/simplefin/transform.ts`** — `inferOrgName()` + `inferAccountType()` fallbacks for when banks don't send type/org

### SimpleFIN Quota

- **24 requests/day** max. Exceeding causes warnings then disables access token.
- Daily cron (every 2h) = 12 requests/day — safe headroom.
- Historical import = 3 requests, runs once (`historicalImportDone` flag prevents re-runs).
- Quota guard env: `SIMPLEFIN_QUOTA_GUARD=20` (blocks before hitting hard limit).

### What Was Built — Session 2026-04-07 (`feat/sync-button`)

**Sync Button + Status Endpoint:**
- Sidebar Sync Now button — `idle/syncing/done/error/quota` states with color feedback
- `GET /api/v1/sync/status` — returns `lastSyncAt` (cross-day via `getLastSyncAt`), quota usage, next scheduled sync
- Startup auto-sync in `instrumentation.ts` — triggers background sync if last sync >2h ago
- Sync window widened from 3 days → 7 days (dedup prevents double-inserts)

**Full Transaction History Page (`/transactions`):**
- `GET /api/v1/transactions` — account filter, date range, limit, offset (pagination)
- `listTransactions()` adapter — no 30-day cap, `hasMore` pagination pattern
- `/transactions` page — defaults to This Month, all accounts combined
- Account dropdown filter + date range tabs (This Month / Last Month / 3mo / 6mo / All Time)
- Transfer/Zelle badge detection, red/green amounts, pending badges, Load More
- Transactions nav item added to Sidebar

**Tests:**
- 8 new unit tests (adapter: pagination, filtering, offset, date range)
- 84 new E2E tests — API shape + **data binding** (real DB values verified in UI) + filtering behavior across all 4 browsers

### What Was Built — Session 2026-04-08 (`feat/page-revamp`)

**Performance — eliminated tab lag and double-click bug:**
- Root cause: two issues compounding — Next.js dev lazy compilation (600–900ms first visit, unavoidable in dev) + self-referential HTTP fetches from server pages to their own API routes (adds 500–1000ms)
- Fix 1: All server pages (`/`, `/budget`, `/credit`, `/subscriptions`, `/summary`, `/transactions`, `/recurring`, `/settings`) now call adapters/handlers directly with `getDb()` — no more HTTP round-trip
- Fix 2: `loading.tsx` skeletons added to ALL routes — skeleton renders instantly on click, content streams in
- Fix 3: Sidebar prefetches all 8 routes on mount via `router.prefetch()` — pre-compiles routes before first visit
- Note: First-click lag in **dev mode** is normal (Next.js lazy compilation). In **production** (`pnpm build && pnpm start`) all routes are pre-compiled and navigation is instant.

**Unknown Account Alerts:**
- `inferOrgName()` returns 'Unknown' when bank doesn't send org name and no BANK_PATTERNS match
- Sidebar: amber dot appears next to Settings nav item when any account `orgName === 'Unknown'`
- Settings page: amber banner with inline "Sync Now" button when `unknownCount > 0`
- `settings/page.tsx` is async — passes `unknownCount` to `SettingsView` as prop
- Both checks use `GET /api/v1/accounts` — no new endpoint needed

**Ocean UI Theme — built then reverted:**
- User did not like the look — reverted in same session
- Do NOT re-apply: depth-*/ocean-* color tokens, teal borders, sky-* text classes, animated gradient body
- Keep: zinc/blue/white palette (the original)

**Files changed:**
- `src/app/loading.tsx` — new root-level skeleton
- `src/app/settings/loading.tsx` — new settings skeleton
- All other `*/loading.tsx` — standardized skeleton pattern
- All `src/app/*/page.tsx` — direct DB calls replacing fetch()
- `src/components/Sidebar.tsx` — route prefetch + amber dot for unknown accounts
- `src/components/SettingsView.tsx` — amber banner + `unknownCount` prop
- `src/app/settings/page.tsx` — async, passes unknownCount
- `tests/e2e/transactions.spec.ts` — non-null assertions on guarded array access (TS strict)

### Test Coverage

| Branch | Unit Tests | E2E Tests |
|--------|-----------|-----------|
| `feat/sync-button` | 233/233 ✅ | 83 passed, 1 skipped (mobile account column) ✅ |
| `feat/page-revamp` (current) | 233/233 ✅ | 83 passed, 1 skipped ✅ |

### Merge Status

| Branch | Merged to master |
|--------|-----------------|
| `feat/initial-setup` | ✅ Merged |
| `feat/simplefin-sync` | ✅ Merged |
| `feat/budget-alerts` | ✅ Merged |
| `feat/session-3` | ✅ Merged (via master squash) |
| `feat/fico-advisor` | ✅ Merged (via master squash) |
| `feat/sync-button` | ✅ Merged (via master squash) |
| `feat/page-revamp` | ✅ Merged 2026-04-10 |

### What Was Fixed — Infra Session (`chore/lan-access`, 2026-04-03)

**Cron was silently failing since deployment:**
- **Root cause** — system cron runs with a bare `PATH`; `npx` lives under nvm (`~/.nvm/versions/node/v24.14.1/bin/`) which is never loaded by cron
- **Fix** — updated crontab entry to use the full absolute path for npx: `/home/garci/.nvm/versions/node/v24.14.1/bin/npx tsx scripts/cron-sync.ts`
- **Rule** — ALWAYS use full absolute paths in crontab entries. Never rely on `npx`, `node`, or `tsx` by name — cron won't find them.

**`dotenv` package was missing:**
- `scripts/cron-sync.ts` imports `dotenv/config` but the package was never installed
- Fixed with `pnpm add dotenv`

**`db-query.ts` runner was broken:**
- Used `StrictDB.create({ uri: process.env.STRICTDB_URI! })` directly, bypassing the `MONGODB_URI` bridge in `src/adapters/db.ts`
- Fixed to use `getDb()` from `src/adapters/db.ts` + added `import 'dotenv/config'` at top
- Added `recent-txns` query (`scripts/queries/recent-txns.ts`) for checking latest DB transactions

**Dev server LAN access (phone):**
- Added `-H 0.0.0.0` to all `dev` scripts in `package.json` so the server binds to all interfaces
- Windows firewall rule required: `New-NetFirewallRule -DisplayName "Next.js Dev" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow`

**SimpleFIN transaction gap (March 29 – present):**
- Not a code bug — SimpleFIN Bridge hadn't pulled fresh data from the bank
- Our DB is current with everything SimpleFIN has provided (through March 28)
- Cron will auto-pick up new transactions within 2 hours once SimpleFIN refreshes

### What Was Built — CI/CD Session (`feat/page-revamp`, 2026-04-10)

**CI/CD Pipeline:**
- GitHub Actions workflow at `.github/workflows/ci.yml` — runs on every push/PR to `master`
- Self-hosted runner on local WSL2 machine (`~/actions-runner/`) — avoids GitHub IP allowlist issues
- Pipeline: type check → unit tests → E2E tests (Chromium only in CI) → failure summary
- E2E uses local MongoDB (`mongodb://localhost:27017/bill-tracker`) — no Atlas needed for CI
- Failure summary step parses `test-results/results.json` and prints only failed test names + errors
- Stale results cleared before each run to prevent false negatives
- Playwright only installs if `/home/garci/.cache/ms-playwright` doesn't exist — no redundant installs
- `gh` CLI installed system-wide — use `gh run watch` to monitor CI from terminal
- MongoDB Atlas account created (free tier) — available for future production deployment
- Repo is now **public** on GitHub (branch protection requires paid plan for private repos)

**Runner notes:**
- Runner binary: `~/actions-runner/run.sh` — must be running for CI to pick up jobs
- Runner is repo-scoped to `blueguy23/bill-tracker` (account-level runners require Team plan)
- **TODO next session:** configure runner as a systemd/WSL background service so it auto-starts

### What Was Built — Feature Session (2026-04-15)

**5 features built on separate branches, all merged to master. Runner started manually before session (`cd ~/projects/bill-tracker/actions-runner && nohup ./run.sh > ~/runner.log 2>&1 &`).**

**Dashboard Overhaul (`feat/dashboard-overhaul`):**
- `CashFlowCard` — income / expenses / net this month with split bar visualization (`data-testid="cash-flow-card"`)
- `SpendingChart` — horizontal bar chart by bill category (`data-testid="spending-chart"`)
- `getCashFlowThisMonth(db)` adapter — sums positive (income) vs negative (expenses) from current-month transactions, excludes pending
- `computeSpendingByCategory()` — derives spending totals from recurring bills for chart data
- Unit tests: 5 new tests for `getCashFlowThisMonth`; E2E: 8 new tests for both cards

**Auto-Categorization (`feat/auto-categorization`):**
- `src/lib/categorization/types.ts` — `TransactionCategory` union (10 categories), `CATEGORY_LABELS`, `CATEGORY_COLORS`, `CategoryRule` interface
- `src/lib/categorization/defaultRules.ts` — 100+ keyword/pattern pairs, order-sensitive (uber eats before uber)
- `src/lib/categorization/engine.ts` — `categorize()`: user rules first, then defaults, regex support, invalid regex skipped
- `src/adapters/categoryRules.ts` — `listCategoryRules`, `upsertCategoryRule`, `setTransactionCategory`
- `PATCH /api/v1/transactions/:id/category` — validates against allowlist, Next.js 15 `await params`
- `CategoryBadge` inline dropdown in `TransactionsView` — live PATCH on change
- Auto-categorizes new transactions during `upsertTransaction` (preserves `categorySource: 'user'`)
- Unit tests: 13 tests for categorization engine

**Manual Transaction Tagging (`feat/manual-tagging`):**
- `src/adapters/transactionTags.ts` — `setTransactionTags` (normalize, dedup, max 10, max 50 chars each), `setTransactionNotes` (trim, truncate 500, null when empty)
- `PATCH /api/v1/transactions/:id/tags` — validates array, rejects >10 tags
- `PATCH /api/v1/transactions/:id/notes` — validates string or null
- `TagsRow` component in `TransactionsView` — inline add/remove tags + notes editor, live PATCH
- `Transaction` type extended: `tags?: string[]`, `notes?: string | null`
- Unit tests: 11 tests for tags/notes adapters

**Export / Reports (`feat/export-reports`):**
- `GET /api/v1/export` — CSV download, accepts `startDate`, `endDate`, `accountId` params, defaults to current month
- `escapeCSV()` — wraps commas/quotes/newlines; prefixes `=`, `+`, `@` with `'` (OWASP CSV injection guard)
- Export CSV button in `TransactionsView` filter bar — reads current date range + account filter, triggers browser download
- Unit tests: 16 tests for `escapeCSV` and `buildCSV`; E2E: 7 tests for export flow

**Onboarding Flow (`feat/onboarding-flow`):**
- `OnboardingBanner` rewritten — 4-step wizard: Connect SimpleFIN → Sync accounts → Add first bill → Set budget
- Progress bar: `(completedCount / 4) * 100`%; hides when all done
- `GET /api/v1/onboarding` — returns `{ simplefinConfigured, accountCount, billCount, hasBudget, currentStep }`
- Uses `SIMPLEFIN_URL` only (canonical var, not `SIMPLEFIN_ACCESS_URL`)
- Dashboard passes `billCount` and `hasBudget` props to `OnboardingBanner`
- Unit tests: 11 tests for step derivation; E2E: 2 onboarding API tests

**Test totals after all merges: 294 unit tests (294 passing), all E2E green.**

### Next Session Ideas

- **Runner auto-start** — configure as background service so `run.sh` starts automatically with WSL
- **UI polish** — user rejected Ocean UI; if doing another theme pass, get explicit approval on direction first (show mockup or color palette before implementing)
- **Auth (Phase 5)** — NextAuth magic link, required before any public launch
- **MDD docs for 04-budget-alerts and 07-subscription-detection** — retroactive docs
- **Category rules UI** — settings page for managing custom categorization rules

### Known Pre-Launch Gaps

- Last audit: **2026-04-02** — all findings fixed
- MDD docs missing for: `04-budget-alerts`, `07-subscription-detection`
- No auth — single-user only until Phase 5 implemented
- Runner must be manually started — correct path: `cd ~/projects/bill-tracker/actions-runner && nohup ./run.sh > ~/runner.log 2>&1 &`

---

