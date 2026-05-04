import { createHash } from 'node:crypto';
import type { Transaction } from '@/lib/simplefin/types';
import type { Bill } from '@/types/bill';
import type { DetectedSubscription, SubscriptionInterval } from '@/types/subscription';
import { normalizeDescription, toDisplayName, inferCategory } from './normalize';
import { classifyRecurringType } from './classify';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const INTERVAL_WINDOWS: Record<SubscriptionInterval, { min: number; max: number; midpoint: number }> = {
  weekly:    { min: 5,  max: 9,  midpoint: 7  },
  biweekly:  { min: 12, max: 16, midpoint: 14 },
  monthly:   { min: 26, max: 35, midpoint: 30 },
  quarterly: { min: 85, max: 95, midpoint: 90 },
};

const INTERVAL_ORDER: SubscriptionInterval[] = ['weekly', 'biweekly', 'monthly', 'quarterly'];

function makeId(key: string, interval: string): string {
  return createHash('sha1').update(`${key}:${interval}`).digest('hex').slice(0, 16);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

// Round amount to the nearest $0.50 bucket so charges like $9.99/$10.00 cluster together
// but $15.99 and $22.99 stay separate.
function amountBucket(amount: number): number {
  return Math.round(Math.abs(amount) * 2) / 2;
}

export function detectSubscriptions(
  transactions: Transaction[],
  existingBills: Bill[],
): DetectedSubscription[] {
  const expenses = transactions.filter((t) => t.amount < 0 && !t.pending);

  const normalizedBillNames = existingBills.map((b) => ({
    id: b._id,
    normalized: normalizeDescription(b.name),
  }));

  // Group by normalized description + amount bucket so different price points
  // for the same merchant become separate subscriptions instead of being averaged.
  const groups = new Map<string, Transaction[]>();
  for (const txn of expenses) {
    const nameKey   = normalizeDescription(txn.description);
    const bucket    = amountBucket(txn.amount);
    const key       = `${nameKey}::${bucket}`;
    const existing  = groups.get(key) ?? [];
    existing.push(txn);
    groups.set(key, existing);
  }

  const results: DetectedSubscription[] = [];

  for (const [compoundKey, txns] of groups) {
    // Need at least 2 occurrences at the same price point
    if (txns.length < 2) continue;

    const nameKey = compoundKey.split('::')[0] ?? compoundKey;

    const sorted = [...txns].sort((a, b) => a.posted.getTime() - b.posted.getTime());

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev && curr) {
        gaps.push((curr.posted.getTime() - prev.posted.getTime()) / MS_PER_DAY);
      }
    }

    let winningInterval: SubscriptionInterval | null = null;
    let maxHits = 0;

    for (const interval of INTERVAL_ORDER) {
      const window = INTERVAL_WINDOWS[interval];
      const hits = gaps.filter((g) => g >= window.min && g <= window.max).length;
      if (hits >= 1 && hits > maxHits) {
        maxHits = hits;
        winningInterval = interval;
      }
    }

    if (!winningInterval) continue;

    // Bill dedup — skip if already tracked
    const matchedBill = normalizedBillNames.find(
      (b) => nameKey.includes(b.normalized) || b.normalized.includes(nameKey),
    );
    if (matchedBill) continue;

    // All transactions in this group share the same amount bucket, so amounts
    // are genuinely consistent. Use the most recent actual charge amount (not an average).
    const amounts = txns.map((t) => Math.abs(t.amount));
    const lastTxn = sorted[sorted.length - 1];
    if (!lastTxn) continue;

    const actualAmount = Math.abs(lastTxn.amount);

    // Small variance check — e.g. tax differences on the same plan
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    const amountVariance = (maxAmount - minAmount) / actualAmount > 0.05;

    const confidence: 'high' | 'medium' = (txns.length >= 3 && maxHits >= 2) ? 'high' : 'medium';

    const { type: recurringType, confidence: typeConfidence } = classifyRecurringType(txns, nameKey, amountVariance);

    const lastCharged    = lastTxn.posted;
    const midpoint       = INTERVAL_WINDOWS[winningInterval].midpoint;
    const nextEstimated  = addDays(lastCharged, midpoint);
    const accountIds     = [...new Set(txns.map((t) => t.accountId))];
    const rawDescriptions = [...new Set(txns.map((t) => t.description))];

    results.push({
      id: makeId(compoundKey, winningInterval),
      normalizedName: toDisplayName(nameKey),
      rawDescriptions,
      amount: actualAmount,
      amountVariance,
      interval: winningInterval,
      lastCharged,
      nextEstimated,
      occurrences: txns.length,
      accountIds,
      confidence,
      suggestedCategory: inferCategory(nameKey),
      matchedBillId: null,
      recurringType,
      typeConfidence,
    });
  }

  const confidenceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return results.sort((a, b) => {
    const cd = (confidenceOrder[a.confidence] ?? 2) - (confidenceOrder[b.confidence] ?? 2);
    return cd !== 0 ? cd : b.amount - a.amount;
  });
}
