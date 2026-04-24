# Infrastructure

## Environments

| Environment | URL | Database | Notes |
|-------------|-----|----------|-------|
| Development | http://localhost:3000 | `mongodb://localhost:27017/bill-tracker` | `pnpm dev` |
| Test (E2E) | http://localhost:4000 | `mongodb://localhost:27017/bill-tracker` | Playwright spins up on port 4000 |
| Production | https://yourdomain.com | MongoDB Atlas (free tier) | Docker container |

## Deployment — Self-Hosted Docker

The app runs as a single Docker container. MongoDB is external (Atlas recommended).

### Requirements
- VPS with Docker + Docker Compose installed
- Domain name with DNS pointed at the server (for TLS)
- MongoDB Atlas free cluster (or self-hosted Mongo)

### Networking
- Port 3000 exposed by Docker container
- Traefik reverse proxy configuration is included (commented out) in `docker-compose.yml` for HTTPS termination with Let's Encrypt

### Image
- Base: `node:22-slim` (Debian, glibc — Alpine/musl breaks native addons)
- Multi-stage: builder → runner
- Non-root user: `node` (uid 1000)
- Standalone output: `output: 'standalone'` in `next.config.ts`
- All secrets passed at runtime via env vars — never baked in

### Container health check
The compose file polls `GET /api/v1/health` every 30s. The endpoint verifies MongoDB connectivity and returns 503 if unhealthy. The container is marked `unhealthy` after 3 failures, which triggers a restart via `restart: unless-stopped`.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):

1. **TypeScript** — type safety gate
2. **Security Audit** — `pnpm audit --audit-level=high`
3. **Unit Tests** — Vitest
4. **E2E Tests** — Playwright + Chromium against local MongoDB
5. **Docker Build** — verify image builds (master pushes only, no push to registry)

Runner: self-hosted on the dev machine at `~/projects/bill-tracker/actions-runner/`.

Start runner:
```bash
cd ~/projects/bill-tracker/actions-runner && nohup ./run.sh > ~/runner.log 2>&1 &
```

## Cron (Bank Sync)

Sync runs every 2 hours via system cron. Uses full binary paths because cron doesn't load nvm:

```
0 */2 * * * /home/garci/.nvm/versions/node/v24.14.1/bin/npx tsx /home/garci/projects/bill-tracker/scripts/cron-sync.ts >> /home/garci/projects/bill-tracker/logs/sync.log 2>&1
```

Quota: SimpleFIN allows 24 requests/day. Cron at 2h = 12 requests. Historical import = 3 requests (one-time). Guard set to 20 via `SIMPLEFIN_QUOTA_GUARD`.

## Database Migrations

Index migrations are tracked in the `_migrations` collection.

```bash
pnpm db:migrate          # apply all pending
pnpm db:migrate:status   # show what's applied / pending
pnpm db:migrate:down     # revert last migration
```

Migrations are idempotent. Run them after first deploy and after pulling changes that add new indexes.

## Monitoring

- **Health endpoint:** `GET /api/v1/health` — checks DB ping, returns uptime and response time
- **Logs:** JSON lines to stdout in production; human-readable in development
  - Set `LOG_LEVEL=debug` for verbose output
  - Collect with: `docker compose logs -f app`
- **Sync log:** `logs/sync.log` on the host (written by cron)
- **Discord:** Optional bill-due notifications via webhook

## Secrets Management

All secrets are environment variables. Never hardcoded. In production, pass via:
- Docker Compose: `env_file: .env`
- Dokploy: environment variable configuration in the UI

Required secrets for production:
- `MONGODB_URI` — database connection string with credentials
- `AUTH_SECRET` — NextAuth signing key (`npx auth secret`)
- `AUTH_PASSWORD` — login password

Optional secrets:
- `SIMPLEFIN_URL` — includes credentials in the URL
- `TROVE_API_KEY`
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- `DISCORD_WEBHOOK_URL`
