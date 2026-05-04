import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { StrictDB } from 'strictdb';
import { listTransactionsForDetection } from '@/adapters/accounts';
import { listBills, listSubscriptionBills, createBill, updateLastChargedAmount } from '@/adapters/bills';
import { dismissSubscription, listDismissedSubscriptions } from '@/adapters/subscriptions';
import { detectSubscriptions } from '@/lib/subscriptions/detect';
import type { DetectedSubscription, DetectedSubscriptionResponse } from '@/types/subscription';
import type { SubscriptionInterval } from '@/types/subscription';
import type { BillCategory, RecurringType } from '@/types/bill';

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

  // Silently update lastChargedAmount when detected price drifts from the tracked bill amount
  const priceUpdates: Promise<void>[] = [];
  for (const d of detected) {
    const bill = trackedBillMap.get(d.id);
    if (bill && Math.abs((bill.lastChargedAmount ?? bill.amount) - d.amount) > 0.5) {
      priceUpdates.push(updateLastChargedAmount(db, bill._id, d.amount));
    }
  }
  await Promise.all(priceUpdates);

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
    typeof b.category !== 'string'
  ) {
    return NextResponse.json({ error: 'id, name, amount, interval, category are required' }, { status: 400 });
  }

  const recurringType   = (b.recurringType as RecurringType | undefined) ?? 'subscription';
  const isSubscription  = recurringType !== 'bill';
  const rawDescriptions = Array.isArray(b.rawDescriptions)
    ? (b.rawDescriptions as unknown[]).filter((d): d is string => typeof d === 'string')
    : [];

  const bill = await createBill(db, {
    name:               b.name as string,
    amount:             b.amount as number,
    dueDate:            new Date(b.lastCharged as string).getDate(),
    category:           b.category as BillCategory,
    isRecurring:        true,
    recurrenceInterval: b.interval as SubscriptionInterval,
    isAutoPay:          true,
    isPaid:             false,
    isSubscription,
    detectionId:        b.id as string,
    notes:              rawDescriptions.length > 0 ? rawDescriptions.join(', ') : undefined,
    classificationMeta: b.classificationMeta as { recurringType: RecurringType; billScore: number; subScore: number; signals: string[] } | undefined,
  });

  return NextResponse.json({ anchored: true, billId: bill._id });
}
