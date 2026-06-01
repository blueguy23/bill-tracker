export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export interface PayPeriodBounds {
  start: Date;
  end: Date;
  isActive: boolean;
  dayNumber: number;
  totalDays: number;
  daysLeft: number;
}

export interface PayPeriodEvent {
  date: Date;
  type: 'bill' | 'income';
  name: string;
  amount: number;
  detail?: string;
  projectedBalance: number;
}

export interface PayPeriodStats {
  income: number;
  spent: number;
  billsDue: number;
  billsDueCount: number;
  remaining: number;
  safeToSpend: number;
  spentPercent: number;
  transactionCount: number;
}

export interface PayPeriodComparison {
  prevIncome: number;
  prevSpent: number;
  prevSafeToSpend: number;
  prevSavingsRate: number;
  incomeDelta: number;
  spentDelta: number;
  safeToSpendDelta: number;
  savingsRateDelta: number;
}

export interface DailyBalance {
  date: string;
  balance: number;
  isProjected: boolean;
  events: PayPeriodEvent[];
}

export interface CategorySpend {
  label: string;
  amount: number;
}

export interface PayConfig {
  frequency: PayFrequency;
  anchor: Date;
}

export interface PayPeriodDashboardData {
  period: PayPeriodBounds;
  stats: PayPeriodStats;
  dailyBalances: DailyBalance[];
  upcomingEvents: PayPeriodEvent[];
  categorySpend: CategorySpend[];
  comparison: PayPeriodComparison | null;
  balanceWarning: string | null;
  nextPayday: string;
}
