# Folio — Personal Finance Tracker

A self-hosted personal finance dashboard that syncs bank accounts via SimpleFIN, tracks bills, monitors budgets, and categorizes transactions automatically.

**Stack:** Next.js 15 (App Router) · TypeScript strict · MongoDB (StrictDB) · Tailwind CSS · Vitest + Playwright · Docker

---

## Quick Start (local dev)

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set: MONGODB_URI, AUTH_SECRET, AUTH_PASSWORD

# 3. Apply DB indexes
pnpm db:migrate

# 4. (Optional) Seed demo data
pnpm db:query seed-demo --confirm

# 5. Start the dev server
pnpm dev
```

Open http://localhost:3000 in your browser. Default port is 3000.

### Auth
Log in with any username and the password you set in `AUTH_PASSWORD`.

---

## Environment Variables

See [`.env.example`](.env.example) for the full reference with descriptions.

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `AUTH_SECRET` | Yes (prod) | NextAuth secret — run `npx auth secret` |
| `AUTH_PASSWORD` | Yes | Login password |
| `SIMPLEFIN_URL` | No | SimpleFIN bridge URL for bank sync |
| `TROVE_API_KEY` | No | Transaction enrichment (free tier) |
| `UPSTASH_REDIS_REST_URL` | No | Rate limiting for login endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | No | Rate limiting for login endpoint |
| `DISCORD_WEBHOOK_URL` | No | Bill-due notifications |
| `TRANSFER_OWNER_NAME` | No | Your name to filter self-Zelle transfers |
| `LOG_LEVEL` | No | `error` / `warn` / `info` / `debug` (default: `info`) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm typecheck` | TypeScript type-check only |
| `pnpm test` | All tests (unit + E2E) |
| `pnpm test:unit` | Unit/integration tests (Vitest) |
| `pnpm test:e2e` | E2E tests (Playwright, Chromium) |
| `pnpm test:coverage` | Unit tests with coverage report |
| `pnpm db:migrate` | Apply pending DB index migrations |
| `pnpm db:migrate:status` | Show migration status |
| `pnpm db:migrate:down` | Revert the last migration |
| `pnpm db:query <name>` | Run a named dev/debug query |
| `pnpm db:query:list` | List all registered queries |
| `pnpm db:query seed-demo --confirm` | Wipe and seed with demo data |
| `pnpm clean` | Remove build artifacts and test results |

---

## Docker (self-hosted)

### Run with Docker Compose

```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f app

# Stop
docker compose down
```

The app reads all config from the `.env` file via `env_file: .env` in compose. No secrets are baked into the image.

### Build the image manually

```bash
docker build \
  --build-arg NEXT_PUBLIC_RYBBIT_SITE_ID= \
  --build-arg NEXT_PUBLIC_RYBBIT_URL= \
  -t bill-tracker:latest .
```

### Health check

```
GET /api/v1/health
```

Returns `200 OK` when the app and database are healthy, `503` when degraded:

```json
{
  "status": "ok",
  "timestamp": "2026-04-23T12:00:00.000Z",
  "uptime": 3600.5,
  "responseTimeMs": 4,
  "checks": { "db": { "status": "ok" } }
}
```

---

## API Overview

All endpoints require authentication (NextAuth session cookie) and use the `/api/v1/` prefix.

The health endpoint is public:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Service and DB health |

Core data endpoints (all auth-protected):

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/v1/bills` | List / create bills |
| GET/PATCH/DELETE | `/api/v1/bills/:id` | Get / update / delete a bill |
| GET/POST | `/api/v1/transactions` | List / query transactions |
| GET | `/api/v1/transactions/search` | Full-text search |
| PATCH | `/api/v1/transactions/:id/category` | Override transaction category |
| GET/POST | `/api/v1/accounts` | List accounts / manual account |
| GET | `/api/v1/accounts/balances` | Current account balances |
| GET/POST | `/api/v1/budgets` | List / set budgets |
| GET | `/api/v1/summary` | Monthly spending summary |
| POST | `/api/v1/sync` | Trigger SimpleFIN sync |
| GET | `/api/v1/sync/status` | Last sync status + quota |
| GET | `/api/v1/credit/summary` | Credit utilization summary |
| GET | `/api/v1/health` | Health check (public) |

---

## Deployment Runbook

### First deployment

1. Provision a VPS with Docker and Docker Compose installed.
2. Clone the repo: `git clone git@github.com:blueguy23/bill-tracker.git`
3. Copy and fill in env: `cp .env.example .env && nano .env`
   - Set `MONGODB_URI` to your Atlas connection string (or run Mongo locally)
   - Set `AUTH_SECRET` (run `npx auth secret` to generate)
   - Set `AUTH_PASSWORD`
   - Set `NODE_ENV=production`
4. Build and start: `docker compose up -d --build`
5. Apply DB indexes: `docker compose exec app node -e "require('./scripts/migrate.js')"`
   (or run `pnpm db:migrate` from the host if Node is installed)
6. Verify health: `curl http://localhost:3000/api/v1/health`

### Update deployment

```bash
git pull
docker compose up -d --build
```

The app uses `restart: unless-stopped` — the container restarts automatically if it crashes.

### Rollback

```bash
# Roll back to the previous image tag
docker tag bill-tracker:latest bill-tracker:rollback-$(date +%Y%m%d)
git checkout HEAD~1
docker compose up -d --build
```

### View logs

```bash
docker compose logs -f app
# or for the last 100 lines:
docker compose logs --tail=100 app
```

### Force sync

```bash
curl -X POST http://localhost:3000/api/v1/sync \
  -H "Cookie: <your session cookie>"
```

### Seed demo data (dev only)

```bash
pnpm db:query seed-demo --confirm
```

This wipes all existing data — only use on a dev/test database.

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `master`:

1. **TypeScript** — `pnpm typecheck`
2. **Security Audit** — `pnpm audit --audit-level=high` (fails on high/critical CVEs)
3. **Unit Tests** — Vitest
4. **E2E Tests** — Playwright (Chromium, needs local MongoDB)
5. **Docker Build** — Verifies the image builds cleanly (master pushes only)

A self-hosted GitHub Actions runner must be running for jobs to execute:

```bash
cd ~/projects/bill-tracker/actions-runner && nohup ./run.sh > ~/runner.log 2>&1 &
```

Monitor CI: `gh run watch`

---

## Project Docs

| Document | Purpose |
|----------|---------|
| `project-docs/ARCHITECTURE.md` | System overview and data flow |
| `project-docs/INFRASTRUCTURE.md` | Environments and deployment |
| `project-docs/DECISIONS.md` | Architectural decision records |
