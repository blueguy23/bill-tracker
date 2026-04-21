export type BillCategory =
  | 'utilities'
  | 'subscriptions'
  | 'insurance'
  | 'rent'
  | 'loans'
  | 'other';

export type RecurrenceInterval =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export const BILL_CATEGORIES: BillCategory[] = [
  'utilities',
  'subscriptions',
  'insurance',
  'rent',
  'loans',
  'other',
];

export const RECURRENCE_INTERVALS: RecurrenceInterval[] = [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
];

export interface Bill {
  _id: string;
  name: string;
  amount: number;
  /** Date for one-off bills; day-of-month (1–31) for recurring bills */
  dueDate: Date | number;
  category: BillCategory;
  isPaid: boolean;
  isAutoPay: boolean;
  isRecurring: boolean;
  /** Required when isRecurring === true */
  recurrenceInterval?: RecurrenceInterval;
  /** YYYY-MM of the month this bill was marked paid — used to reset status each month */
  paidMonth?: string;
  /** Most recent transaction amount detected for this bill — tracks price drift */
  lastChargedAmount?: number;
  url?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBillDto {
  name: string;
  amount: number;
  /** ISO date string for one-off bills; day-of-month number for recurring */
  dueDate: string | number;
  category: BillCategory;
  isPaid?: boolean;
  isAutoPay?: boolean;
  isRecurring: boolean;
  recurrenceInterval?: RecurrenceInterval;
  url?: string;
  notes?: string;
}

export type UpdateBillDto = Partial<CreateBillDto>;

/** Serialized Bill returned by all API responses (dates as ISO strings) */
export interface BillResponse {
  _id: string;
  name: string;
  amount: number;
  dueDate: string | number;
  category: BillCategory;
  isPaid: boolean;
  isAutoPay: boolean;
  isRecurring: boolean;
  recurrenceInterval?: RecurrenceInterval;
  paidMonth?: string;
  lastChargedAmount?: number;
  url?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillSummary {
  totalOwedThisMonth: number;
  totalPaid: number;
  overdueCount: number;
  autoPayTotal: number;
}
