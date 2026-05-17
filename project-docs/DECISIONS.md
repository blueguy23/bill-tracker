# Architectural Decisions

> Record of key technical decisions and their rationale.

## Template

### Decision: [Title]
- **Date:** YYYY-MM-DD
- **Status:** Accepted / Superseded / Deprecated
- **Context:** What prompted the decision
- **Decision:** What was decided
- **Consequences:** What are the trade-offs
- **Alternatives considered:** What else was evaluated

---

<!-- Add decisions below -->

### Decision: Enforce architectural layer boundaries via ESLint

- **Date:** 2026-05-17
- **Status:** Accepted
- **Context:** The project uses a layered architecture (`app → handlers → adapters → lib → types`) but nothing enforced these boundaries at build time. An audit found two violations already present: `SpendingSection` and `MonthlySummary` components were importing `SummaryResponse` directly from an API route file (`src/app/api/v1/summary/route.ts`), creating an upward dependency from `components → app`. Without automated enforcement, these violations accumulate silently and erode the layer separation over time — especially in AI-assisted development where generated code doesn't inherently respect architectural intent.
- **Decision:** Added `eslint-plugin-boundaries` (v6) with `eslint-import-resolver-typescript` to resolve `@/` path aliases. The `boundaries/dependencies` rule enforces a strict import hierarchy:

  | Layer | Allowed imports |
  |-------|----------------|
  | `app` | app, handlers, adapters, components, lib, types, auth |
  | `components` | components, adapters, lib, types, auth |
  | `handlers` | handlers, adapters, lib, types |
  | `adapters` | adapters, lib, types |
  | `lib` | lib, adapters, types |
  | `types` | types only |

  The `lib → adapters` edge is intentional: `lib/budget/rollover.ts` orchestrates adapter calls, and `lib/categorization/troveMapping.ts` imports a type from the Trove adapter. This is a pragmatic choice — `lib` is not purely leaf-level utility code in this project; some modules contain business logic that coordinates data access.

  The two existing violations were fixed by extracting `SummaryResponse` and `MerchantStat` types from the route file into `src/types/summary.ts`.

- **Consequences:**
  - Any import that violates the layer hierarchy now fails the `pnpm lint` step, which runs in CI (`.github/workflows/ci.yml` lint job). No additional CI configuration was needed.
  - New layers or cross-cutting exceptions require updating the rule config in `eslint.config.mjs`.
  - Adds two dev dependencies: `eslint-plugin-boundaries`, `eslint-import-resolver-typescript`.
  - Slightly increases lint time (~2s) due to import resolution.

- **Alternatives considered:**
  - **`dependency-cruiser`** — more powerful (graph visualization, orphan detection) but heavier config, separate CI step, and doesn't integrate with the existing ESLint workflow.
  - **`madge`** — circular dependency detection only, doesn't enforce directional layer rules.
  - **Manual code review** — doesn't scale, violations were already present and unnoticed.
