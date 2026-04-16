import type { TransactionCategory, CategoryRule } from './types';
import { DEFAULT_RULES } from './defaultRules';

/**
 * Categorize a transaction based on its description and optional memo.
 * User-defined rules are checked first (in insertion order), then default rules.
 * Returns 'other' if nothing matches.
 */
export function categorize(
  description: string,
  memo: string | null,
  userRules: CategoryRule[] = [],
): TransactionCategory {
  const haystack = `${description} ${memo ?? ''}`.toLowerCase();

  // User rules take priority
  for (const rule of userRules) {
    if (matches(haystack, rule.pattern, rule.isRegex)) {
      return rule.category;
    }
  }

  // Built-in keyword rules
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
      return false; // invalid regex — skip silently
    }
  }
  return haystack.includes(pattern.toLowerCase());
}
