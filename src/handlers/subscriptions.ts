import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { StrictDB } from 'strictdb';
import { listTransactionsForDetection } from '@/adapters/accounts';
import { listBills, listSubscriptionBills, createBill, updateLastChargedAmount } from '@/adapters/bills';
import { recordCharge } from '@/adapters/chargeHistory';
import { dismissSubscription, listDismissedSubscriptions } from '@/adapters/subscriptions';
import { detectSubscriptions } from '@/lib/subscriptions/detect';
import type { DetectedSubscription, DetectedSubscriptionResponse } from '@/types/subscription';
import type { SubscriptionInterval } from '@/types/subscription';
import type { BillCategory, RecurringType } from '@/types/bill';
import { logger } from '@/lib/logger';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HINT_STOPWORDS = new Set([
  'the', 'and', 'for', 'from', 'with', 'payment', 'online', 'bill',
  'pay', 'ach', 'web', 'auto', 'recurring', 'debit', 'purchase',
]);

function buildHintFromDescriptions(descriptions: string[]): string | undefined {
  if (descriptions.length === 0) return undefined;
  const hint = descriptions[0]!
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length >= 3)
    .filter(w => !HINT_STOPWORDS.has(w))
    .join(' ');
  return hint.length >= 3 ? hint : undefined;
}

// ─── Serialization ────────────────────────────────────────────────────────────

function serializeDetected(d: DetectedSubscription): DetectedSubscriptionResponse {
  return {
    id: d.id,
    normalizedName: d.normalizedName,
    rawDescriptions: d.rawDescriptions,
    amount: d.amount,
    amountVariance: d.amountVariance,
    interval: d.interval,
    lastCharged: d.lastCharged.toISOString(),
    nextEstimated: d.nextEstimated.toISOString(),
    occurrences: d.occurrences,
    accountIds: d.accountIds,
    confidence: d.confidence,
    suggestedCategory: d.suggestedCategory,
    matchedBillId: d.matchedBillId,
    recurringType: d.recurringType,
    typeConfidence: d.typeConfidence,
    signals: d.signals,
    lastTransactionId: d.lastTransactionId,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleListSubscriptions(db: StrictDB): Promise<Response> {
  const [transactions, allBills, dismissed, subBills] = await Promise.all([
    listTransactionsForDetection(db),
    listBills(db),
    listDismissedSubscriptions(db),
    listSubscriptionBills(db),
  ]);

  const detected = detectSubscriptions(transactions, allBills);

  const dismissedIds   = new Set(dismissed.map((d) => d._id));
  const trackedIds     = new Set(subBills.map((b) => b.detectionId).filter(Boolean) as string[]);
  const trackedBillMap = new Map(subBills.filter((b) => b.detectionId).map((b) => [b.detectionId!, b]));

  // Update lastChargedAmount when price actually drifts (skip charge history on reads)
  const priceUpdates: Promise<unknown>[] = [];
  for (const d of detected) {
    const bill = trackedBillMap.get(d.id);
    if (bill && Math.abs((bill.lastChargedAmount ?? bill.amount) - d.amount) > 0.5) {
      priceUpdates.push(updateLastChargedAmount(db, bill._id, d.amount));
    }
  }
  if (priceUpdates.length) await Promise.all(priceUpdates);

  // Return only pending items — not dismissed and not already tracked in bills
  const pending = detected.filter((s) => !dismissedIds.has(s.id) && !trackedIds.has(s.id));

  return NextResponse.json({ subscriptions: pending.map(serializeDetected) });
}

export async function handleDismissSubscription(
  db: StrictDB,
  req: NextRequest,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    typeof body !== 'object' || body === null ||
    !('id' in body) ||
    typeof (body as Record<string, unknown>).id !== 'string' ||
    !(body as Record<string, unknown>).id
  ) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await dismissSubscription(db, (body as { id: string }).id);
  return NextResponse.json({ dismissed: true });
}

export async function handleAnchorSubscription(
  db: StrictDB,
  req: NextRequest,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (
    typeof b.id !== 'string'       || !b.id   ||
    typeof b.name !== 'string'     || !b.name  ||
    typeof b.amount !== 'number'              ||
    typeof b.interval !== 'string'            ||
    typeof b.category !== 'string'            ||
    typeof b.lastCharged !== 'string'         ||
    isNaN(Date.parse(b.lastCharged as string))
  ) {
    return NextResponse.json({ error: 'id, name, amount, interval, category, lastCharged (valid date) are required' }, { status: 400 });
  }

  const recurringType   = (b.recurringType as RecurringType | undefined) ?? 'subscription';
  const isSubscription  = recurringType !== 'bill';
  const rawDescriptions = Array.isArray(b.rawDescriptions)
    ? (b.rawDescriptions as unknown[]).filter((d): d is string => typeof d === 'string')
    : [];

  const hint = buildHintFromDescriptions(rawDescriptions);

  const bill = await createBill(db, {
    name:               b.name as string,
    amount:             b.amount as number,
    dueDate:            b.interval === 'yearly'
      ? new Date(b.lastCharged as string).toISOString()
      : new Date(b.lastCharged as string).getDate(),
    category:           b.category as BillCategory,
    isRecurring:        true,
    recurrenceInterval: b.interval as SubscriptionInterval,
    isAutoPay:          true,
    isPaid:             false,
    isSubscription,
    detectionId:        b.id as string,
    paymentDescriptionHint: hint,
    notes:              rawDescriptions.length > 0 ? rawDescriptions.join(', ') : undefined,
    classificationMeta: b.classificationMeta as { recurringType: RecurringType; billScore: number; subScore: number; signals: string[] } | undefined,
  });

  if (hint) {
    logger.info('anchor.hintLearned', { billName: b.name, hint });
  }

  // Seed charge history with the initial detected charge
  await recordCharge(db, bill._id, b.amount as number);

  return NextResponse.json({ anchored: true, billId: bill._id });
}
