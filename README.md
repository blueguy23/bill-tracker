# bill-tracker

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** StrictDB (unified driver)
- **Styling:** Tailwind CSS
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Deployment:** Docker (multi-stage, standalone)

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Commands

Run `/help` in Claude Code to see all 16 available commands.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Build for production |
| `pnpm test` | Run all tests |
| `pnpm test:unit` | Unit tests |
| `pnpm test:e2e` | E2E tests |
| `pnpm db:query <name>` | Run a database query |
| `pnpm db:query:list` | List available queries |

## Project Documentation

| Document | Purpose |
|----------|---------|
| `project-docs/ARCHITECTURE.md` | System overview & data flow |
| `project-docs/INFRASTRUCTURE.md` | Deployment details |
| `project-docs/DECISIONS.md` | Architectural decisions |
