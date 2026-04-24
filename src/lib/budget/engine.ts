import type { BillCategory } from '@/types/bill';
import type { Budget, QuickAddTransaction, BurnRateResult, BudgetStatus } from '@/types/budget';

// Transactions shape expected from SimpleFIN adapter
export interface SpendingTransaction {
  _id: string;
  accountId: string;
  posted: Date;
  amount: number;       // negative = expense, positive = credit
  category?: BillCategory;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function parseMonth(month: string): { year: number; monthIndex: number } {
  const [y, m] = month.split('-').map(Number);
  return { year: y!, monthIndex: m! - 1 };
}

function isInMonth(date: Date, year: number, monthIndex: number): boolean {
  return date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex;
}

// ── computeSpending ────────────────────────────────────────────────────────────

export function computeSpending(
  transactions: SpendingTransaction[],
  quickAdds: QuickAddTransaction[],
  category: BillCategory,
  month: string,
): number {
  const { year, monthIndex } = parseMonth(month);

  const txnSpend = transactions
    .filter((t) => t.category === category && isInMonth(t.posted, year, monthIndex) && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const qaSpend = quickAdds
    .filter((qa) => qa.category === category && qa.matchedTransactionId === null)
    .reduce((sum, qa) => sum + qa.amount, 0);

  return txnSpend + qaSpend;
}

// ── computeEffectiveBudget ────────────────────────────────────────────────────

export function computeEffectiveBudget(budget: Pick<Budget, 'monthlyAmount' | 'rolloverBalance'>): number {
  return budget.monthlyAmount + budget.rolloverBalance;
}

// ── computeRollover ───────────────────────────────────────────────────────────

export function computeRollover(
  budget: Pick<Budget, 'monthlyAmount' | 'rolloverBalance'>,
  actualSpent: number,
): number {
  return computeEffectiveBudget(budget) - actualSpent;
}

// ── computeBurnRate ───────────────────────────────────────────────────────────

export function computeBurnRate(
  transactions: SpendingTransaction[],
  quickAdds: QuickAddTransaction[],
  category: BillCategory,
  month: string,
  options: { today?: Date; effectiveBudget?: number } = {},
): BurnRateResult {
  const today = options.today ?? new Date();
  const { year, monthIndex } = parseMonth(month);
  const totalDays = daysInMonth(year, monthIndex);
  const daysElapsed = Math.max(1, today.getUTCDate());
  const effectiveBudget = options.effectiveBudget ?? 0;

  const totalSpent = computeSpending(transactions, quickAdds, category, month);

  // Linear projection
  const linearDailyRate = totalSpent / daysElapsed;
  const linearProjectedTotal = linearDailyRate * totalDays;

  // 7-day rolling average
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { year: _sy, monthIndex: _sm } = parseMonth(month);
  const rollingTxns = transactions.filter(
    (t) =>
      t.category === category &&
      t.amount < 0 &&
      t.posted >= sevenDaysAgo &&
      t.posted <= today,
  );
  const rollingQAs = quickAdds.filter(
    (qa) =>
      qa.category === category &&
      qa.matchedTransactionId === null &&
      qa.addedAt >= sevenDaysAgo &&
      qa.addedAt <= today,
  );
  const rollingSpend =
    rollingTxns.reduce((s, t) => s + Math.abs(t.amount), 0) +
    rollingQAs.reduce((s, qa) => s + qa.amount, 0);
  const rollingAvgDailyRate = rollingSpend / 7;
  const rollingProjectedTotal = rollingAvgDailyRate * totalDays;

  const divergentThreshold = effectiveBudget * 0.15;
  const divergent =
    divergentThreshold > 0 &&
    Math.abs(linearProjectedTotal - rollingProjectedTotal) > divergentThreshold;

  return {
    linearDailyRate,
    linearProjectedTotal,
    rollingAvgDailyRate,
    rollingProjectedTotal,
    divergent,
  };
}

// ── computeCategoryStatus ──────────────────────────────────────────────────────

export function computeCategoryStatus(
  effectiveBudget: number,
  projectedTotal: number,
): BudgetStatus {
  if (projectedTotal > effectiveBudget) return 'over_budget';
  if (projectedTotal >= effectiveBudget * 0.9) return 'warning';
  return 'on_track';
}
