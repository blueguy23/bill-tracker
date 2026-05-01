# Folio — Implementation Notes
> Design decisions and logic that need to be wired up during implementation.

---

## Payments Page

### "Next due in X days" logic
The next-due countdown on the Payments hero is derived entirely from existing local data — no external API calls needed.

```js
const nextBill = bills
  .filter(b => b.status !== 'paid')
  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  .find(b => new Date(b.dueDate) >= today)

const daysUntilDue = differenceInDays(new Date(nextBill.dueDate), today)
// 0  → "due today"
// <0 → show overdue warning instead
// >0 → "due in X days"
```

**Data sources:**
- `bills` collection in MongoDB — manually entered via `+ Add Bill` or confirmed from Recurring tab
- Auto-detected recurring bills from SimpleFIN transaction patterns → promoted to bills collection once user confirms, with projected `dueDate` calculated from detected frequency

### Payday gap warning logic
The "bill due before payday" warning compares `bill.dueDate` against `user.payDay`.

**Dependency:** `user.payDay` must exist as a field in the user profile/Settings. This needs to be a Settings field — day of month (e.g. `24`) or a specific date pattern (e.g. `last friday of month`).

Without `user.payDay` set, the gap warning should not render.

---

## Transactions Page

### Payee vs. raw description
- `payee` field from SimpleFIN GAP 2 → displayed as primary merchant label (`tx-merchant`)
- Raw `memo`/`description` field → displayed as secondary muted line (`tx-desc`), truncated with ellipsis
- `transactedAt` from GAP 2 → precise timestamp shown in `tx-meta`

### Pending transactions
- Rendered when `includePending=1` is active in filter state
- `tx-row.pending` class applied when `transaction.pending === true`
- Pending section only renders if at least 1 pending transaction exists

### Split transactions
- Stored as child transactions linked to parent via `parentId`
- Parent row shows `SPLIT` badge and "N categories" in meta line
- Split action available in row hover actions

---

## Dashboard

### Portfolio widget
- `holdings[]` data from SimpleFIN GAP 3 — `Account.holdings[].market_value` and `ticker`
- Share count: derive from `market_value ÷ current_price` via external price API, or store separately
- Daily % change requires secondary price call per ticker — suggested: Yahoo Finance unofficial endpoint or Alpha Vantage free tier (500 calls/day free)
- Widget only renders if at least one account has `holdings.length > 0`
- Footer note: "Via SimpleFIN · market data delayed" — always shown to set expectations

---

## Credit Health

### Data source decision
No free bureau API exists for indie developers. Recommended approach:
- **Manual entry** — user inputs score from their bank app, Discover, Capital One, etc.
- Framed as a privacy feature: "your score lives here, not on Credit Karma's ad servers"
- Sparkline history builds naturally as user logs monthly updates
- Lender lens cards and action items calculated locally from stored score — no external API needed
- Architecture leaves clean integration point for bureau API later (Experian/TransUnion/Equifax require FCRA compliance + commercial agreement — out of scope for private beta)

**Fields to store per score entry:**
```
{
  score: number,          // 300–850
  bureau: string,         // 'transunion' | 'equifax' | 'experian'
  date: Date,             // when user recorded it
  factors: {              // optional, user can fill in
    paymentHistory: number,   // percentage
    utilization: number,      // percentage
    creditAge: string,        // e.g. "7y 4mo"
    accounts: number,
    hardInquiries: number,
    derogatory: number
  }
}
```

### Current implementation state (post-redesign)

The redesign (`feature/credit-health-redesign`) implements three zones from `design/credit-health (1).html`:
- **Zone 1 — Verdict card** (`CreditVerdictCard.tsx`): FICO gauge, utilization sparkline, 6-factor mini grid
- **Zone 2 — Lender lens** (`CreditLenderLens.tsx`): mortgage / auto / credit card impact at current score
- **Zone 3 — Actions grid** (`CreditActionsGrid.tsx`): "Do this now" (amber, AZEO-driven) + "Build this habit" (blue, static)

### What's next after E2E testing

**1. Manual FICO score entry** ← highest priority
The gauge and all lender lens calculations require a real 300–850 FICO score. The current `computeHealthScore()` in `handlers/credit.ts` returns a 0–100 internal health score — a useful internal metric but meaningless on the gauge.

Implementation path:
- Add a `creditScores` collection: `{ score, bureau, date, factors? }`
- Add a `/api/v1/credit/score` POST route (handler: `handleSaveCreditScore`)
- Add a "Log score" button to the Credit Health page header (client component)
- `handleGetCreditSummary` should return the most recent logged score; fall back to `null` (which hides Zone 1 and the lender lens gracefully)
- Score history sparkline in Zone 1 will then show real score history (not inverted utilization)

**2. Factor inputs alongside manual score**
When the user logs a score, offer optional factor fields (payment history %, utilization %, credit age, accounts, inquiries, derogatory). These populate the 6 mini-cards in Zone 1 with real data instead of estimates.

**3. Wire the "Refresh" button**
The `data-testid="refresh-score-btn"` button in the page header is currently inert (server component). Wrap the page header in a thin client component that calls `router.refresh()` on click.

**4. "Do this now" — inquiry detection**
The design shows "Dispute the inquiry from Feb 2026" as a dynamic action. Hard inquiries aren't currently tracked. If added (manual entry or bureau API), inject as a `nowActions` item in `CreditActionsGrid.buildNowActions()` with impact `+6 est. pts`.

---

## Settings

### Required user profile fields
Fields identified during design that must exist in the user schema:
- `user.payDay` — day of month payday falls on, used for Payments gap warning logic

---

## CI/CD & Branching Strategy

### Branching model — GitHub Flow
Solo indie dev setup. Simple, linear, designed for continuous deployment.

```
main (protected — always deployable)
│
├── feature/nav-ia-update          ← Sidebar IA: 7 pages → 5 (merge FIRST)
├── feature/dashboard-portfolio-widget
├── feature/transactions-redesign
├── feature/payments-redesign
├── feature/budget-goals-redesign
├── feature/credit-health-redesign
├── feature/settings-redesign
└── feature/e2e-tests              ← Merge LAST (depends on all above)
```

### Merge order
Order matters — each feature builds on the previous:
1. `feature/nav-ia-update` — sidebar IA change affects every page
2. `feature/dashboard-portfolio-widget`
3. `feature/transactions-redesign`
4. `feature/payments-redesign`
5. `feature/budget-goals-redesign`
6. `feature/credit-health-redesign`
7. `feature/settings-redesign`
8. `feature/e2e-tests` — last, after all pages are implemented

### Branch protection rules for `main`
Set in GitHub → Settings → Branches → Add rule for `main`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass (CI pipeline)
- ✅ Require branches to be up to date before merging
- ❌ Do not require approvals (solo dev)
- ✅ Do not allow bypassing the above settings

### CI pipeline — `.github/workflows/ci.yml`
Runs on every push to a feature branch and every PR to `main`:
```yaml
name: CI

on:
  push:
    branches-ignore: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install

      # Type check
      - run: pnpm tsc --noEmit

      # Unit tests
      - run: pnpm test

      # Lint
      - run: pnpm lint

      # E2E (Playwright)
      - run: pnpm playwright install --with-deps
      - run: pnpm playwright test
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI_TEST }}
```

### PR description template
Each PR should reference its design source so context is preserved:
```
Implements: design/<page>.html
Tests: tests/e2e/<page>.spec.ts
data-testid coverage: see E2E_TEST_PLAN.md §<section number>
```

### Secrets required in GitHub
- `MONGODB_URI_TEST` — test database URI (separate from production)
- Any other `.env` values needed at test time should be added as GitHub Actions secrets


Dashboard cards are **summary previews, not destinations**. The pattern throughout is:
- Card body click → navigates to the full page where that data lives
- "View →" / "Details →" / "All →" link in the card header → same destination
- No expand-in-place modals on dashboard cards (keeps the dashboard fast and uncluttered)
- Each card should have `cursor: pointer` on hover

### Card navigation map

| Card | Click destination | Notes |
|---|---|---|
| Net / Monthly Net | `/transactions` | Shows full transaction list for the period |
| Bills Owed | `/payments` | Opens on Bills tab |
| AutoPay | `/payments` | Opens on Bills tab, filtered to autopay |
| Spend by Category | `/transactions` | Pre-filtered by the selected category |
| Budget | `/budget` | Opens Budget & Goals on Budget tab |
| Recent Transactions | `/transactions` | Full transaction list, same date range |
| Portfolio widget | `/accounts` (future page) | Full holdings detail, charts, history |

### Portfolio card — special case
The Portfolio page does not exist yet. Until it does:
- Card header "Details →" link should be disabled or hidden
- Card body click does nothing (no navigation)
- Add a `data-testid="portfolio-widget"` flag so E2E tests can assert it renders without clicking through

### Bills card — optional drawer pattern
The Bills card on the dashboard is the one candidate for an expand-in-place pattern — a quick drawer showing the bills list so the user doesn't have to leave the dashboard for a fast check. If implemented:
- Drawer slides up from bottom (mobile) or appears as a popover (desktop)
- Contains the same urgency-sorted bill list from the Payments page
- "View all in Payments →" link at the bottom of the drawer navigates to the full page
- Drawer dismiss returns user to dashboard with no state change
- This is optional — navigate-to-page is acceptable as the simpler implementation

### Implementation notes for Next.js
```tsx
// Card click handler pattern
<div
  onClick={() => router.push('/payments')}
  className="bot-card cursor-pointer"
  data-testid="bills-card"
>
  {/* card content */}
  <div className="bot-header">
    <span className="bot-title">Bills Owed</span>
    <Link href="/payments" className="bot-link" onClick={e => e.stopPropagation()}>
      View →
    </Link>
  </div>
</div>
```
Note: `e.stopPropagation()` on the header link prevents double-navigation when the link and the card body both have click handlers.
