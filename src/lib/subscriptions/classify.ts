import type { Transaction } from '@/lib/simplefin/types';
import type { RecurringType } from '@/types/bill';
import { CATEGORY_KEYWORDS } from './normalize';

export type { RecurringType };

interface ClassifyResult {
  type: RecurringType;
  confidence: 'high' | 'medium' | 'low';
  billScore: number;
  subScore: number;
  signals: string[];
}

// Category signal weights — mirrors what MCC ranges would give us but via Trove enrichment
const CATEGORY_WEIGHTS: Partial<Record<string, { bill: number; sub: number }>> = {
  utilities:      { bill: 3, sub: 0 },
  subscriptions:  { bill: 0, sub: 3 },
  entertainment:  { bill: 0, sub: 2 },
  health:         { bill: 1, sub: 0 }, // insurance/medical — usually fixed, often a bill
  income:         { bill: 0, sub: 0 },
  transfer:       { bill: 0, sub: 0 },
  food:           { bill: 0, sub: 0 },
  transport:      { bill: 0, sub: 0 },
  shopping:       { bill: 0, sub: 0 },
  other:          { bill: 0, sub: 0 },
};

// Keyword override — checked against normalizedName when Trove hasn't enriched any txn in the group
const BILL_KEYWORDS = [
  ...CATEGORY_KEYWORDS.utilities,
  ...CATEGORY_KEYWORDS.insurance,
  ...CATEGORY_KEYWORDS.loans,
  ...CATEGORY_KEYWORDS.rent,
];

const SUB_KEYWORDS = CATEGORY_KEYWORDS.subscriptions;

export function classifyRecurringType(
  txns: Transaction[],
  normalizedName: string,
  amountVariance: boolean,
): ClassifyResult {
  let billScore = 0;
  let subScore  = 0;
  const signals: string[] = [];

  // ── Signal 1: dominant category across the transaction group ──────────────
  const enrichedCount = txns.filter((t) => t.category !== undefined).length;
  const seenCategories = new Set<string>();
  for (const txn of txns) {
    if (!txn.category) continue;
    const w = CATEGORY_WEIGHTS[txn.category];
    if (!w) continue;
    billScore += w.bill;
    subScore  += w.sub;
    if (!seenCategories.has(txn.category)) {
      seenCategories.add(txn.category);
      if (w.bill > 0 || w.sub > 0) signals.push(`${txn.category}_category`);
    }
  }

  // ── Signal 2: amount variance ─────────────────────────────────────────────
  if (amountVariance) {
    billScore += 2;
    signals.push('variable_amount');
  } else {
    subScore += 1;
    signals.push('fixed_amount');
  }

  // ── Signal 3: keyword list (fallback when Trove hasn't enriched any txn) ──
  if (enrichedCount === 0) {
    if (BILL_KEYWORDS.some((kw) => normalizedName.includes(kw))) {
      billScore += 2;
      signals.push('bill_keyword');
    }
    if (SUB_KEYWORDS.some((kw) => normalizedName.includes(kw))) {
      subScore += 2;
      signals.push('subscription_keyword');
    }
  }

  // ── Classification ────────────────────────────────────────────────────────
  const gap = Math.abs(billScore - subScore);
  let confidence: 'high' | 'medium' | 'low';
  if      (gap >= 4) confidence = 'high';
  else if (gap >= 2) confidence = 'medium';
  else               confidence = 'low';

  let type: RecurringType;
  if      (billScore > subScore) type = 'bill';
  else if (subScore > billScore) type = 'subscription';
  else                           type = 'recurring';

  return { type, confidence, billScore, subScore, signals };
}
