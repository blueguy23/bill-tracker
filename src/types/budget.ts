import type { BillCategory } from './bill';

export type BudgetStatus = 'on_track' | 'warning' | 'over_budget';

export interface Budget {
  _id: string;           // same as category
  category: BillCategory;
  monthlyAmount: number;
  rolloverBalance: number;
  updatedAt: Date;
}

export interface QuickAddTransaction {
  _id: string;
  description: string;
  amount: number;        // positive = expense
  category: BillCategory;
  addedAt: Date;
  matchedTransactionId: string | null;
}

export interface BurnRateResult {
  linearDailyRate: number;
  linearProjectedTotal: number;
  rollingAvgDailyRate: number;
  rollingProjectedTotal: number;
  divergent: boolean;
}

export interface CategoryBudgetSummary {
  category: BillCategory;
  monthlyAmount: number | null;
  rolloverBalance: number;
  effectiveBudget: number | null;
  spent: number;
  remaining: number | null;
  status: BudgetStatus | null;
  burnRate: BurnRateResult | null;
}

export interface SetBudgetDto {
  monthlyAmount: number;
}

export interface CreateQuickAddDto {
  description: string;
  amount: number;
  category: BillCategory;
}

export interface DedupeMatch {
  quickAddId: string;
  transactionId: string;
}
