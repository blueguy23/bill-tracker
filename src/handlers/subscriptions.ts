import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { StrictDB } from 'strictdb';
import { listTransactionsForDetection } from '@/adapters/accounts';
import { listBills } from '@/adapters/bills';
import { dismissSubscription, listDismissedSubscriptions } from '@/adapters/subscriptions';
import { detectSubscriptions } from '@/lib/subscriptions/detect';
import type { DetectedSubscription, DetectedSubscriptionResponse } from '@/types/subscription';

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
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleListSubscriptions(db: StrictDB): Promise<Response> {
  const [transactions, bills, dismissed] = await Promise.all([
    listTransactionsForDetection(db),
    listBills(db),
    listDismissedSubscriptions(db),
  ]);

  const detected = detectSubscriptions(transactions, bills);
  const dismissedIds = new Set(dismissed.map((d) => d._id));
  const filtered = detected.filter((s) => !dismissedIds.has(s.id));

  return NextResponse.json({ subscriptions: filtered.map(serializeDetected) });
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
    typeof body !== 'object' ||
    body === null ||
    !('id' in body) ||
    typeof (body as Record<string, unknown>).id !== 'string' ||
    !(body as Record<string, unknown>).id
  ) {
    return NextResponse.json({ error: 'id is required and must be a non-empty string' }, { status: 400 });
  }

  const id = (body as { id: string }).id;
  await dismissSubscription(db, id);
  return NextResponse.json({ dismissed: true });
}
