# CLAUDE.md — Project Instructions

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
