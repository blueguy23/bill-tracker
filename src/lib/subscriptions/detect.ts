import { createHash } from 'node:crypto';
import type { Transaction } from '@/lib/simplefin/types';
import type { Bill } from '@/types/bill';
import type { DetectedSubscription, SubscriptionInterval } from '@/types/subscription';
import { normalizeDescription, toDisplayName, inferCategory } from './normalize';

// ─── Constants ────────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const INTERVAL_WINDOWS: Record<SubscriptionInterval, { min: number; max: number; midpoint: number }> = {
  weekly:    { min: 5,  max: 9,  midpoint: 7  },
  biweekly:  { min: 12, max: 16, midpoint: 14 },
  monthly:   { min: 26, max: 35, midpoint: 30 },
  quarterly: { min: 85, max: 95, midpoint: 90 },
};

const INTERVAL_ORDER: SubscriptionInterval[] = ['weekly', 'biweekly', 'monthly', 'quarterly'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(key: string, interval: string): string {
  return createHash('sha1').update(`${key}:${interval}`).digest('hex').slice(0, 16);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ─── Core detection ───────────────────────────────────────────────────────────

export function detectSubscriptions(
  transactions: Transaction[],
  existingBills: Bill[],
): DetectedSubscription[] {
  // Step 1: Filter settled expenses only
  const expenses = transactions.filter((t) => t.amount < 0 && !t.pending);

  // Normalize existing bill names for dedup check
  const normalizedBillNames = existingBills.map((b) => ({
    id: b._id,
    normalized: normalizeDescription(b.name),
  }));

  // Step 2 & 3: Normalize and group by description
  const groups = new Map<string, Transaction[]>();
  for (const txn of expenses) {
    const key = normalizeDescription(txn.description);
    const existing = groups.get(key) ?? [];
    existing.push(txn);
    groups.set(key, existing);
  }

  const results: DetectedSubscription[] = [];

  for (const [key, txns] of groups) {
    if (txns.length < 2) continue;

    // Step 3: Sort by date ascending
    const sorted = [...txns].sort((a, b) => a.posted.getTime() - b.posted.getTime());

    // Step 4: Compute day-gaps between consecutive transactions
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev && curr) {
        gaps.push((curr.posted.getTime() - prev.posted.getTime()) / MS_PER_DAY);
      }
    }

    // Find the interval with the most matching gaps
    // Require ≥ 2 hits for high confidence; allow 1 hit for medium (covers 2-occurrence case)
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

    // Step 5: Amount consistency
    const amounts = txns.map((t) => Math.abs(t.amount));
    const avgAmount = mean(amounts);
    const amountVariance = amounts.some((a) => Math.abs(a - avgAmount) / avgAmount > 0.10);

    // Step 6: Bill dedup — skip if already tracked
    const matchedBill = normalizedBillNames.find(
      (b) => key.includes(b.normalized) || b.normalized.includes(key),
    );
    if (matchedBill) continue;

    // Step 7: Confidence — high needs ≥ 3 occurrences AND ≥ 2 consistent gaps
    const confidence = (txns.length >= 3 && maxHits >= 2) ? 'high' : 'medium';

    // Step 8: Build result
    const lastTxn = sorted[sorted.length - 1];
    if (!lastTxn) continue;

    const lastCharged = lastTxn.posted;
    const midpoint = INTERVAL_WINDOWS[winningInterval].midpoint;
    const nextEstimated = addDays(lastCharged, midpoint);

    const accountIds = [...new Set(txns.map((t) => t.accountId))];
    const rawDescriptions = [...new Set(txns.map((t) => t.description))];

    results.push({
      id: makeId(key, winningInterval),
      normalizedName: toDisplayName(key),
      rawDescriptions,
      amount: Math.round(avgAmount * 100) / 100,
      amountVariance,
      interval: winningInterval,
      lastCharged,
      nextEstimated,
      occurrences: txns.length,
      accountIds,
      confidence,
      suggestedCategory: inferCategory(key),
      matchedBillId: null,
    });
  }

  // Step 9: Sort by confidence desc, then amount desc
  const confidenceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return results.sort((a, b) => {
    const cd = (confidenceOrder[a.confidence] ?? 2) - (confidenceOrder[b.confidence] ?? 2);
    return cd !== 0 ? cd : b.amount - a.amount;
  });
}
