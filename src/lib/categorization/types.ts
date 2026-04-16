export type TransactionCategory =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'utilities'
  | 'subscriptions'
  | 'income'
  | 'transfer'
  | 'other';

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'health',
  'utilities',
  'subscriptions',
  'income',
  'transfer',
  'other',
];

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  food: 'Food & Dining',
  transport: 'Transport',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  health: 'Health',
  utilities: 'Utilities',
  subscriptions: 'Subscriptions',
  income: 'Income',
  transfer: 'Transfer',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<TransactionCategory, { bg: string; text: string }> = {
  food:          { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  transport:     { bg: 'bg-blue-500/10',   text: 'text-blue-400' },
  shopping:      { bg: 'bg-violet-500/10', text: 'text-violet-400' },
  entertainment: { bg: 'bg-pink-500/10',   text: 'text-pink-400' },
  health:        { bg: 'bg-emerald-500/10',text: 'text-emerald-400' },
  utilities:     { bg: 'bg-cyan-500/10',   text: 'text-cyan-400' },
  subscriptions: { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  income:        { bg: 'bg-green-500/10',  text: 'text-green-400' },
  transfer:      { bg: 'bg-zinc-500/10',   text: 'text-zinc-400' },
  other:         { bg: 'bg-zinc-500/10',   text: 'text-zinc-500' },
};

export interface CategoryRule {
  _id: string;
  pattern: string;       // keyword or regex string
  category: TransactionCategory;
  isRegex: boolean;
  createdAt: Date;
}
