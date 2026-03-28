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

