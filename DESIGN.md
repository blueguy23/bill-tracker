# DESIGN.md — Visual Design System

> Source of truth: Penpot file "New File 1" > page "Dashboard — Current"
> Last synced: 2026-05-22

---

## 1. Design Principles

1. **Data-dense, not decorative** — every pixel serves comprehension. No ornamental borders, gradients, or illustrations.
2. **Monospace for numbers, sans for labels** — `IBM Plex Mono` for amounts/values/dates, `Plus Jakarta Sans` for names/labels/navigation.
3. **Muted chrome, vivid data** — surfaces and borders stay in the gray-900 range; color is reserved for semantic meaning (income, expense, warning, accent).
4. **Card containment** — every data group lives in a `DataCard` (surface fill + border stroke + 12px radius). No floating data.
5. **Consistent density** — 12px is the standard gap between sections and cards. Inner card padding is 20px (or 18v/20h for KPI tiles).

---

## 2. Color Tokens

### Primitives (theme-independent)

| Token | Value | Role |
|-------|-------|------|
| `gray.950` | `#0B0B0F` | Darkest background |
| `gray.925` | `#0F0F14` | Sidebar background |
| `gray.900` | `#131318` | Card surface |
| `gray.875` | `#161224` | Hero section (purple-tinted) |
| `gray.850` | `#17171E` | Raised elements (progress tracks) |
| `gray.800` | `#1E1E2A` | Borders |
| `gray.750` | `#252535` | Light borders (hover states) |
| `gray.500` | `#6B6B85` | Disabled/tertiary text |
| `gray.400` | `#8080A0` | Secondary text |
| `gray.100` | `#EDEDF5` | Primary text |
| `purple.500` | `#7C6CF0` | Accent (flat approx of oklch 0.68/0.22/265) |
| `green.500` | `#22C55E` | Income / success |
| `red.500` | `#EF4444` | Expense / error |
| `gold.500` | `#D4943A` | Warning / due-soon |

### Semantic Tokens — Dark Theme (`:root`)

| Token | Resolves to | CSS var | Usage |
|-------|-------------|---------|-------|
| `color.bg` | `gray.950` | `--bg` | Page background |
| `color.surface` | `gray.900` | `--surface` | Card backgrounds |
| `color.raised` | `gray.850` | `--raised` | Progress bar tracks, bell icon bg |
| `color.border` | `gray.800` | `--border` | Card strokes, dividers |
| `color.border-light` | `gray.750` | `--border-l` | Hover borders, scrollbar thumb hover |
| `color.text.primary` | `gray.100` | `--text` | Headings, amounts, names |
| `color.text.secondary` | `gray.400` | `--text2` | Subtitles, categories, dates |
| `color.text.disabled` | `gray.500` | `--text3` | Uppercase labels, limits, captions |
| `color.accent` | `purple.500` | `--accent` | Active nav, hero highlight, interactive |
| `color.success` | `green.500` | `--green` | Income amounts, positive trends, sync dot |
| `color.error` | `red.500` | `--red` | Expense amounts, negative trends |
| `color.warning` | `gold.500` | `--gold` | DUE badge, warning status dots |
| `color.sidebar.bg` | `gray.925` | `--sidebar-bg` | Sidebar fill |
| `color.hero.bg` | `gray.875` | — | Month in Review card fill |
| `color.on-fill` | `gray.950` | `--on-fill-text` | Text on colored fills (progress bars) |

### Semantic Tokens — Light Theme (`[data-theme="light"]`)

Same token names, different values. Key differences:

| Token | Light value | CSS var |
|-------|-------------|---------|
| `color.bg` | `#F1F4F8` | `--bg` |
| `color.surface` | `#FFFFFF` | `--surface` |
| `color.accent` | `#C9624A` | `--accent` |
| `color.success` | `#187A5C` | `--green` |
| `color.error` | `#C0432A` | `--red` |
| `color.on-fill` | `#FFFFFF` | `--on-fill-text` |

Light-only tokens (no dark equivalent):

| Token | Value | CSS var | Usage |
|-------|-------|---------|-------|
| `color.accent-soft` | `#FCE6DD` | `--accent-soft` | Accent badge backgrounds |
| `color.success-soft` | `#D5EDE3` | `--good-soft` | Positive indicator backgrounds |
| `color.error-soft` | `#F8DDD3` | `--bad-soft` | Negative indicator backgrounds |
| `color.info` | `#2A5BD7` | `--info` | Informational text/icons |
| `color.info-soft` | `#DEE7FA` | `--info-soft` | Info badge backgrounds |

### Usage Rules

- **Income amounts** always use `color.success`, never raw green
- **Expense amounts** always use `color.error`, never raw red
- **Interactive elements** (links, active nav, buttons) use `color.accent`
- **Do not use `color.accent` for status** — it is for interaction only
- **Uppercase labels** use `color.text.disabled` — never `color.text.secondary`
- **Card backgrounds** are always `color.surface` — never `color.bg` or `color.raised`

---

## 3. Typography

### Font Families

| Token | Family | CSS var | Usage |
|-------|--------|---------|-------|
| `font.mono` | IBM Plex Mono | `--mono` | All numbers, amounts, dates, percentages, KPI values, limits |
| `font.sans` | Plus Jakarta Sans | `--sans` | Navigation labels, headings, names, categories, body text |

Both themes use the same fonts. Light theme additionally loads Inter and JetBrains Mono as system fallbacks.

### Type Scale

| Token | Size | Usage | Font | Weight |
|-------|------|-------|------|--------|
| `text.2xs` | 10px | Uppercase KPI labels, stat labels, badge text | mono | medium (500) + `tracking.wide` |
| `text.xs` | 11px | Captions, sync text, subtitles, limit amounts | mono | regular (400) |
| `text.sm` | 12px | Dates, context lines, trend percentages, category amounts | mono | regular–semibold |
| `text.base` | 13px | Body text, nav labels, bill/tx names, bill amounts | sans (names) / mono (amounts) | medium–semibold |
| `text.md` | 14px | Section titles ("Upcoming Bills", "Recent Transactions") | sans | semibold (600) |
| `text.lg` | 15px | Greeting text | sans | regular (400) |
| `text.xl` | 16px | Stat hero values, net worth amount | mono | bold (700) |
| `text.2xl` | 18px | Logo text | sans | bold (700) |
| `text.3xl` | 24px | KPI hero values ($2,847, 67%, 8/12) | mono | bold (700) |

### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `tracking.wide` | 0.8px | All uppercase labels (KPI, stats, badges) |
| `tracking.wider` | 1.2px | "MONTH IN REVIEW" title only |

### Rules

- Numbers are **always** `font.mono` — no exceptions
- Uppercase labels are **always** `font.mono` + `weight.medium` + `tracking.wide`
- Section titles are **always** `font.sans` + `weight.semibold` + `text.md`
- Never mix fonts within a single text element
- Never use `text.lg` (15px) for anything other than the greeting — it exists only for that element

---

## 4. Spacing

### Scale

| Token | Value | Common usage |
|-------|-------|-------------|
| `space.1` | 2px | Navigation row gap, greeting line gap, name-group line gap |
| `space.2` | 4px | Stat column gap, net worth line gap |
| `space.3` | 6px | KPI internal gap, sync status column gap |
| `space.4` | 8px | KPI value-row column gap (value + trend) |
| `space.5` | 10px | Nav item icon-to-label gap, sidebar horizontal padding |
| `space.6` | 12px | **Standard section gap** — content row gap, KPI tiles column gap, card column gaps, category/bill row gaps |
| `space.7` | 14px | Month in Review internal row gap, net worth vertical padding |
| `space.8` | 18px | KPI card vertical padding, logo vertical padding |
| `space.9` | 20px | Card inner padding (all DataCard instances) |
| `space.10` | 22px | Month in Review vertical padding |
| `space.11` | 24px | Content horizontal padding, header vertical padding, stats column gap, MiR horizontal padding |

### Layout Structure

```
Dashboard (1440 x 1200, flex-row)
├── Sidebar (224px fixed, flex-col, hPad: 10)
│   ├── Logo (hPad: 10, vPad: 18)
│   ├── Navigation (vPad: 8, rowGap: 2)
│   ├── Net Worth (hPad: 12, vPad: 14, rowGap: 4)
│   └── Sync Status (colGap: 6)
└── Content (fill, flex-col, hPad: 24, rowGap: 12)
    ├── Header (vPad: 24, space-between)
    ├── Month in Review (hPad: 24, vPad: 22, rowGap: 14)
    ├── KPI Tiles (flex-row, colGap: 12)
    │   └── KPI Card × 3 (hPad: 20, vPad: 18, rowGap: 6)
    ├── Spending by Category (pad: 20, rowGap: 12)
    └── Bills + Transactions (flex-row, colGap: 12)
        ├── Upcoming Bills (pad: 20)
        └── Recent Transactions (pad: 20)
```

### Rules

- **12px (`space.6`)** is the default gap between sibling sections and cards — use it unless there's a specific reason not to
- **24px (`space.11`)** is the content area inset — never change this
- **20px (`space.9`)** is the standard card inner padding on all four sides
- KPI cards are the exception: `18px top/bottom, 20px left/right` (tighter vertical for data density)
- Sidebar uses `10px` horizontal padding — its children (Net Worth, Sync) use `12px`, creating a 2px visual indent

---

## 5. Radius & Elevation

### Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `radius.xs` | 2px | Progress bar fills, scrollbar thumb |
| `radius.sm` | 3px | Category bar fills |
| `radius.md` | 4px | Status badges ("DUE", "LATE") |
| `radius.lg` | 6px | Nav items |
| `radius.xl` | 10px | — (reserved) |
| `radius.2xl` | 12px | **All cards** — DataCard, KPI tiles, Spending, Bills, Transactions, Month in Review |

### Rules

- All `DataCard` instances use `radius.2xl` (12px) — no exceptions
- Nav items use `radius.lg` (6px)
- Never use rounded-full / pill shapes in this design
- Progress bars: track uses `radius.xs`, fill uses `radius.xs`

### Elevation

No box-shadows are used. Depth is communicated through surface color layering:

| Layer | Token | Depth |
|-------|-------|-------|
| Page | `color.bg` | 0 (deepest) |
| Sidebar | `color.sidebar.bg` | 0.5 |
| Cards | `color.surface` | 1 |
| Raised elements | `color.raised` | 2 |

Cards are distinguished from background by `color.surface` fill + `color.border` 1px stroke. No shadows.

---

## 6. Component Inventory

### NavItem
- **Structure:** flex-row, `colGap: 10`, `hPad: 10`, `vPad: 8`, `radius.lg`
- **Content:** Icon (emoji/glyph) + Label (`font.sans`, `text.base`, `weight.medium`)
- **States:** Default (no fill) / Active (`color.accent` fill, white text)
- **Instances:** 6 (Dashboard, Payments, Budget, Goals, Credit Health, Settings)

### DataCard
- **Structure:** flex-col, `pad: 20`, `radius.2xl`
- **Fill:** `color.surface` | **Stroke:** `color.border` 1px
- **Usage:** Base container for Spending by Category, Upcoming Bills, Recent Transactions
- **Do not nest** DataCards inside DataCards

### KpiTile
- **Structure:** flex-col, `hPad: 20`, `vPad: 18`, `rowGap: 6`, `radius.2xl`
- **Fill:** `color.surface` | **Stroke:** `color.border` 1px
- **Content:** Label (`text.2xs`, uppercase, `tracking.wide`) + ValueRow (hero value `text.3xl` + trend `text.sm`) + Context line (`text.xs`) + ProgressBar
- **Instances:** 3 (Money Left After Bills, Savings Rate, Bills Covered)
- **KpiTile is NOT a DataCard** — it has tighter vertical padding (18 vs 20)

### CategoryRow
- **Structure:** flex-row, `colGap: 12`, 28px height
- **Content:** Icon (emoji) + Name (`font.sans`, `text.base`) + BarTrack/BarFill + Amount (`font.mono`, `text.sm`) + Limit (`font.mono`, `text.xs`, `color.text.disabled`)
- **Instances:** 6 (Housing, Food, Transport, Utilities, Entertainment, Shopping)

### BillRow
- **Structure:** flex-row, `colGap: 12`, 44px height, `vPad: 10`
- **Content:** StatusDot (ellipse) + Name (`font.sans`, `text.base`) + [Badge] + Spacer + Amount (`font.mono`, `text.base`, `weight.semibold`) + DueDate (`font.mono`, `text.xs`)
- **StatusDot colors:** `color.success` (paid), `color.warning` (due soon), `color.error` (overdue)
- **Instances:** 5

### TransactionRow
- **Structure:** flex-row, `colGap: 10`, 44px height
- **Content:** NameGroup (name + category, `rowGap: 2`) + Spacer + Amount (`font.mono`, `text.base`)
- **Amount color:** `color.success` for income, `color.error` for expense
- **Instances:** 5

---

## 7. Component Usage Rules

| Scenario | Component | Notes |
|----------|-----------|-------|
| Wrap a data section (list, chart, table) | `DataCard` | Always. No bare data on `color.bg`. |
| Show a single KPI with progress | `KpiTile` | Max 3–4 per row. Always in a flex-row container with `colGap: 12`. |
| List spending categories with bars | `CategoryRow` | Inside a `DataCard`. Stack vertically with parent `rowGap: 12`. |
| List upcoming bills | `BillRow` | Inside a `DataCard`. No explicit row gap — rows have internal vPad. |
| List recent transactions | `TransactionRow` | Inside a `DataCard`. Same as BillRow. |
| Sidebar navigation link | `NavItem` | Inside Navigation flex-col with `rowGap: 2`. |

### Anti-patterns

| Don't | Do instead |
|-------|-----------|
| Put data directly on `color.bg` without a card | Wrap in `DataCard` |
| Use `DataCard` for KPI metrics | Use `KpiTile` (tighter padding) |
| Mix `colGap: 10` and `colGap: 12` in sibling rows | Bill rows use 12, transaction rows use 10 — keep consistent within each section |
| Add box-shadow to cards | Use `color.surface` + `color.border` stroke only |
| Use `color.accent` for status indicators | Use `color.success` / `color.error` / `color.warning` |
| Use `font.sans` for numbers or amounts | Always `font.mono` for numeric data |
| Use `color.text.secondary` for uppercase labels | Use `color.text.disabled` + `tracking.wide` |

---

## 8. Accessibility

### WCAG AA Contrast (minimum 4.5:1 normal text, 3:1 large text)

| Pairing | Ratio | Verdict |
|---------|-------|---------|
| `color.text.primary` on `color.surface` | 14.5:1 | PASS AAA |
| `color.success` on `color.surface` | 7.2:1 | PASS AAA |
| `color.error` on `color.surface` | 4.8:1 | PASS AA |
| `color.text.secondary` on `color.surface` | 3.8:1 | PASS large text only |
| `color.text.disabled` on `color.surface` | 4.5:1 | PASS AA (after fix from `#44445A`) |
| `color.text.disabled` on `color.bg` | 4.2:1 | Borderline — acceptable for labels |
| `color.accent` on `color.hero.bg` | 4.1:1 | PASS large text only |

### Rules

- `color.text.disabled` (`#6B6B85`) is the **minimum** contrast color for any text. Never use anything darker on dark surfaces.
- `color.text.secondary` (`#8080A0`) only passes for large text (14px bold or 18px regular). Use only for subtitles and secondary labels at `text.base` or larger.
- All body text and data values must use `color.text.primary`.
- Income/expense amounts (`color.success`/`color.error`) pass AA on `color.surface` — safe to use at any size.
- Interactive elements using `color.accent` must be at least `text.base` (13px) with `weight.medium` or heavier.

---

## 9. Token-to-CSS Mapping

Quick reference for translating Penpot tokens to `globals.css` variables:

| Penpot token | CSS variable | Notes |
|-------------|-------------|-------|
| `color.bg` | `--bg` | |
| `color.surface` | `--surface` | |
| `color.raised` | `--raised` | |
| `color.border` | `--border` | |
| `color.border-light` | `--border-l` | |
| `color.text.primary` | `--text` | |
| `color.text.secondary` | `--text2` | |
| `color.text.disabled` | `--text3` / `--muted` | Both are `#6B6B85` |
| `color.accent` | `--accent` | CSS uses `oklch(0.68 0.22 265)`, Penpot uses `#7C6CF0` |
| `color.success` | `--green` / `--inc` | |
| `color.error` | `--red` / `--exp` | |
| `color.warning` | `--gold` | CSS uses `oklch(0.67 0.13 40)` |
| `color.sidebar.bg` | `--sidebar-bg` | CSS adds gradient; Penpot is flat |
| `color.on-fill` | `--on-fill-text` | |
| `font.mono` | `--mono` | |
| `font.sans` | `--sans` | |

Legacy CSS aliases (`--bg-old`, `--s1`, `--s2`, `--s3`, `--b1`, `--b2`, `--text-old`, `--text2-old`) exist for backward compatibility. Do not use them in new code.

---

## 10. Correct vs Incorrect Token Usage

### Colors

```tsx
// CORRECT — semantic tokens
<span style={{ color: 'var(--green)' }}>+$1,200</span>   // income
<span style={{ color: 'var(--red)' }}>-$450</span>        // expense
<span className="text-[var(--text3)]">NET WORTH</span>    // uppercase label

// WRONG — raw primitives or wrong semantics
<span style={{ color: '#22C55E' }}>+$1,200</span>         // hardcoded hex
<span style={{ color: 'var(--accent)' }}>-$450</span>     // accent is for interaction
<span className="text-[var(--text2)]">NET WORTH</span>    // text2 is for subtitles, not labels
```

### Typography

```tsx
// CORRECT
<span className="font-[var(--mono)] text-[24px] font-bold">$2,847</span>  // KPI value
<span className="font-[var(--sans)] text-[13px] font-medium">Electric</span>  // bill name

// WRONG
<span className="font-[var(--sans)] text-[24px]">$2,847</span>  // sans for numbers
<span className="font-[var(--mono)] text-[13px]">Electric</span>  // mono for names
```

### Cards

```tsx
// CORRECT — DataCard wrapper
<div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-5">
  {/* card content */}
</div>

// WRONG — no card, data floating on background
<div className="bg-[var(--bg)] p-5">
  {/* data directly on page background */}
</div>

// WRONG — shadow instead of border
<div className="bg-[var(--surface)] shadow-lg rounded-[12px] p-5">
  {/* no shadows in this design system */}
</div>
```

### Spacing

```tsx
// CORRECT — consistent 12px gap between cards
<div className="flex flex-col gap-3">  {/* 12px */}
  <Card />
  <Card />
</div>

// WRONG — inconsistent gaps
<div className="flex flex-col gap-4">  {/* 16px — not in the scale */}
  <Card />
  <Card />
</div>
```

---

## 11. shadcn Token Aliases

shadcn/ui components reference a fixed set of CSS variable names. Rather than replacing our design tokens, we alias them — shadcn reads its expected names, which resolve to our existing tokens.

### Mapping Table

| Our token (source of truth) | shadcn alias | Purpose |
|---|---|---|
| `--bg` | `--background` | Page background |
| `--text` | `--foreground` | Primary text |
| `--surface` | `--card` | Card / panel backgrounds |
| `--text` | `--card-foreground` | Text inside cards |
| `--accent` | `--primary` | Interactive elements (buttons, links, active states) |
| `--on-fill-text` | `--primary-foreground` | Text on accent-filled elements |
| `--text2` | `--secondary-foreground` | Secondary text |
| `--raised` | `--secondary` | Raised surfaces, secondary button backgrounds |
| `--raised` | `--muted` | Muted backgrounds (disabled inputs, skeleton) |
| `--text3` | `--muted-foreground` | Muted/disabled text, placeholders |
| `--border` | `--border` | Already matches — card strokes, dividers |
| `--border` | `--input` | Input field borders |
| `--border` | `--ring` | Focus ring color |
| `--surface` | `--popover` | Dropdown / tooltip / popover backgrounds |
| `--text` | `--popover-foreground` | Text inside popovers |
| `--red` | `--destructive` | Delete/error actions |
| `--on-fill-text` | `--destructive-foreground` | Text on destructive buttons |
| `--accent` | `--accent` | Already matches — interactive highlight |
| `--text` | `--accent-foreground` | Text on accent-tinted backgrounds |

### Rules

- **Our tokens remain the source of truth.** shadcn aliases are a mapping layer, not a replacement.
- **Never use shadcn variable names directly** in custom components — always use our tokens (`--bg`, `--surface`, `--text`, etc.).
- **shadcn components** (Button, Dialog, Select, etc.) use the aliases automatically — no manual wiring needed.
- **Light theme** aliases resolve through the same mapping. Since `[data-theme="light"]` already redefines our tokens, the shadcn aliases inherit the correct values.
- **`--radius`** is set to `0.75rem` (12px) to match our `radius.2xl` card standard. shadcn components that use `rounded-lg` will resolve to this.

### Migration Order

| Phase | Component type | Why this order |
|---|---|---|
| 1 | Token mapping in `globals.css` | Foundation — no visual changes |
| 2 | Button + Badge | Every other shadcn component uses Button internally |
| 3 | Select / Dropdown | Biggest UX gap (native → Radix) |
| 4 | Dialog / Modal | 6 hand-rolled modals → focus trap, scroll lock |
| 5 | Table / DataTable | Sort, filter, column toggle |
| 6 | Card, Switch, ScrollArea | Polish pass |
| 7 | Charts (Recharts) | Separate PR — highest risk, isolated |

**One component type per PR.** Never mix phases in a single branch.
