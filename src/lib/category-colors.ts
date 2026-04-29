// Canonical hex colors per category. Covers both BillCategory and TransactionCategory.
// Use getCategoryColor() for inline style `color:` — it returns CSS vars for semantic tokens.
// Use CATEGORY_COLORS[key] directly when you need a raw hex (Chart.js, alpha-hex backgrounds).
export const CATEGORY_COLORS: Record<string, string> = {
  // Transaction categories
  food:          '#f97316',  // orange-500
  transport:     '#3b82f6',  // blue-500
  shopping:      '#8b5cf6',  // violet-500
  entertainment: '#ec4899',  // pink-500
  health:        '#10b981',  // emerald-500
  utilities:     '#06b6d4',  // cyan-500
  subscriptions: '#6366f1',  // indigo-500
  income:        '#22c55e',  // green-500  — mirrors --positive
  transfer:      '#71717a',  // zinc-500
  // Bill-only categories
  insurance:     '#34d399',  // emerald-400
  rent:          '#fb923c',  // orange-400
  loans:         '#f43f5e',  // rose-500
  // Shared fallback
  other:         '#71717a',  // zinc-500   — mirrors --muted
};

// Returns a CSS var for semantic tokens (income → var(--positive)), hex otherwise.
// Use this for `color:` in inline styles. Do NOT use for Chart.js or alpha-hex tricks.
export function getCategoryColor(category: string): string {
  if (category === 'income') return 'var(--positive)';
  return CATEGORY_COLORS[category] ?? '#71717a';
}

// Ordered hex palette for Chart.js positional charts (doughnut, grouped bar, etc.).
// Chart.js cannot resolve CSS vars at runtime, so this is always plain hex/oklch.
export const CHART_CATEGORY_PALETTE: readonly string[] = [
  'oklch(0.68 0.22 265)',  // accent  (blue-purple)
  '#22c55e',               // income  (= --positive)
  '#ef4444',               // expense (= --negative)
  '#f59e0b',               // amber
  '#c084fc',               // purple
  '#3b82f6',               // blue
  '#34d399',               // emerald
  '#fb923c',               // orange
] as const;
