import type { TransactionCategory, CategoryRule } from './types';
import { DEFAULT_RULES } from './defaultRules';

const BRIDGE_CATEGORY_MAP: Record<string, TransactionCategory> = {
  'food':            'food',
  'food and dining': 'food',
  'groceries':       'food',
  'restaurants':     'food',
  'dining':          'food',
  'transport':       'transport',
  'transportation':  'transport',
  'gas':             'transport',
  'auto':            'transport',
  'shopping':        'shopping',
  'retail':          'shopping',
  'merchandise':     'shopping',
  'entertainment':   'entertainment',
  'recreation':      'entertainment',
  'health':          'health',
  'healthcare':      'health',
  'medical':         'health',
  'pharmacy':        'health',
  'utilities':       'utilities',
  'telecom':         'utilities',
  'subscriptions':   'subscriptions',
  'income':          'income',
  'payroll':         'income',
  'transfer':        'transfer',
  'transfers':       'transfer',
};

export function mapBridgeCategory(raw: string): TransactionCategory | null {
  return BRIDGE_CATEGORY_MAP[raw.toLowerCase()] ?? null;
}

export function categorize(
  description: string,
  memo: string | null,
  userRules: CategoryRule[] = [],
): TransactionCategory {
  const haystack = `${description} ${memo ?? ''}`.toLowerCase();

  for (const rule of userRules) {
    if (matches(haystack, rule.pattern, rule.isRegex)) {
      return rule.category;
    }
  }

  for (const [keyword, category] of DEFAULT_RULES) {
    if (haystack.includes(keyword)) {
      return category;
    }
  }

  return 'other';
}

function matches(haystack: string, pattern: string, isRegex: boolean): boolean {
  if (isRegex) {
    try {
      return new RegExp(pattern, 'i').test(haystack);
    } catch {
      return false;
    }
  }
  return haystack.includes(pattern.toLowerCase());
}
