import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { StrictDB } from 'strictdb';
import { listTransactionsForDetection } from '@/adapters/accounts';
import { listBills } from '@/adapters/bills';
import { dismissSubscription, listDismissedSubscriptions } from '@/adapters/subscriptions';
import {
  anchorSubscription,
  listAnchoredSubscriptions,
  updateAnchoredAmount,
} from '@/adapters/anchoredSubscriptions';
import { detectSubscriptions } from '@/lib/subscriptions/detect';
import type { DetectedSubscription, DetectedSubscriptionResponse } from '@/types/subscription';
import type { AnchoredSubscription, SubscriptionInterval } from '@/types/subscription';
import type { BillCategory } from '@/types/bill';

// ─── Serialization ────────────────────────────────────────────────────────────

function serializeDetected(
  d: DetectedSubscription,
  anchored: AnchoredSubscription | undefined,
): DetectedSubscriptionResponse {
  const priceIncreased =
    anchored !== undefined &&
    Math.abs(anchored.anchoredAmount - d.amount) > 0.5;

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
    isAnchored: anchored !== undefined,
    anchoredAmount: anchored?.anchoredAmount ?? null,
    priceIncreased,
    anchoredAt: anchored?.anchoredAt.toISOString() ?? null,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleListSubscriptions(db: StrictDB): Promise<Response> {
  const [transactions, bills, dismissed, anchored] = await Promise.all([
    listTransactionsForDetection(db),
    listBills(db),
    listDismissedSubscriptions(db),
    listAnchoredSubscriptions(db),
  ]);

  const detected = detectSubscriptions(transactions, bills);

  const dismissedIds = new Set(dismissed.map((d) => d._id));
  const anchoredMap = new Map(anchored.map((a) => [a._id, a]));

  // Silently update lastSeenAmount for any anchored subscriptions whose price changed
  const priceUpdatePromises: Promise<void>[] = [];
  for (const d of detected) {
    const anch = anchoredMap.get(d.id);
    if (anch && Math.abs(anch.lastSeenAmount - d.amount) > 0.5) {
      priceUpdatePromises.push(updateAnchoredAmount(db, d.id, d.amount));
    }
  }
  await Promise.all(priceUpdatePromises);

  const filtered = detected.filter((s) => !dismissedIds.has(s.id));

  return NextResponse.json({
    subscriptions: filtered.map((s) => serializeDetected(s, anchoredMap.get(s.id))),
  });
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

  const b = body as Record<string, unknown>;
  if (
    typeof b.id !== 'string' || !b.id ||
    typeof b.name !== 'string' || !b.name ||
    typeof b.amount !== 'number' ||
    typeof b.interval !== 'string' ||
    typeof b.category !== 'string'
  ) {
    return NextResponse.json({ error: 'id, name, amount, interval, category are required' }, { status: 400 });
  }

  const rawDescriptions = Array.isArray(b.rawDescriptions)
    ? (b.rawDescriptions as string[]).filter((d) => typeof d === 'string')
    : [];

  const doc = await anchorSubscription(
    db,
    b.id as string,
    b.name as string,
    b.amount as number,
    b.interval as SubscriptionInterval,
    b.category as BillCategory,
    rawDescriptions,
  );

  return NextResponse.json({ anchored: true, id: doc._id });
}
