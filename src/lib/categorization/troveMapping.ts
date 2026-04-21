import type { TransactionCategory } from './types';
import type { TroveResult } from '@/adapters/trove';

interface Rule {
  test: (t: TroveResult, description: string) => boolean;
  result: TransactionCategory;
}

// Priority-ordered — first match wins.
// Based on observed Trove responses: industry and categories fields seen in testing.
const RULES: Rule[] = [
  // Food and Dining category covers groceries, restaurants, and food POS (Toast, Square)
  { test: (t) => t.categories.includes('Food and Dining'), result: 'food' },
  { test: (t) => t.industry === 'Restaurants', result: 'food' },

  // Gas station detection — Trove returns 'Retail' for Costco Gas, so check description
  {
    test: (t, desc) =>
      t.industry === 'Retail' && /\b(gas|fuel|petrol|gasoline)\b/i.test(desc),
    result: 'transport',
  },

  // Health
  {
    test: (t) =>
      t.categories.includes('Healthcare') ||
      (t.industry?.toLowerCase().includes('health') ?? false) ||
      (t.industry?.toLowerCase().includes('medical') ?? false) ||
      (t.industry?.toLowerCase().includes('pharma') ?? false),
    result: 'health',
  },

  // Transport
  {
    test: (t) =>
      t.industry === 'Transportation/Trucking/Railroad' ||
      t.industry === 'Airlines/Aviation' ||
      t.industry === 'Automotive' ||
      t.categories.includes('Transportation'),
    result: 'transport',
  },

  // Subscriptions — software/internet that isn't food-related
  {
    test: (t) =>
      t.industry === 'Software Development' ||
      t.industry === 'Internet' ||
      t.industry === 'Computer Software',
    result: 'subscriptions',
  },

  // Entertainment
  {
    test: (t) =>
      t.industry === 'Entertainment' ||
      t.industry === 'Recreational Facilities and Services' ||
      t.categories.includes('Entertainment'),
    result: 'entertainment',
  },

  // Utilities
  {
    test: (t) =>
      t.industry === 'Utilities' ||
      t.industry === 'Telecommunications' ||
      t.industry === 'Wireless',
    result: 'utilities',
  },

  // General retail → shopping
  { test: (t) => t.industry === 'Retail', result: 'shopping' },
  { test: (t) => t.categories.includes('Ecommerce'), result: 'shopping' },
];

export function mapTroveToCategory(
  trove: TroveResult,
  description: string,
): TransactionCategory | null {
  if (!trove.industry && trove.categories.length === 0) return null;

  for (const rule of RULES) {
    if (rule.test(trove, description)) return rule.result;
  }

  return null; // unknown industry — fall back to keyword rules
}
