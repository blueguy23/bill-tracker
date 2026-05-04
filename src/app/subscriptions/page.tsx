import type { Metadata } from 'next';
import type { DetectedSubscriptionResponse, DetectedSubscription, AnchoredSubscription } from '@/types/subscription';
import { SubscriptionsView } from '@/components/SubscriptionsView';
import { getDb } from '@/adapters/db';
import { listTransactionsForDetection } from '@/adapters/accounts';
import { listBills } from '@/adapters/bills';
import { listDismissedSubscriptions } from '@/adapters/subscriptions';
import { listAnchoredSubscriptions } from '@/adapters/anchoredSubscriptions';
import { detectSubscriptions } from '@/lib/subscriptions/detect';

export const metadata: Metadata = { title: 'Subscriptions' };

function serializeDetected(
  d: DetectedSubscription,
  anchored: AnchoredSubscription | undefined,
): DetectedSubscriptionResponse {
  const priceIncreased = anchored !== undefined && Math.abs(anchored.anchoredAmount - d.amount) > 0.5;
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
    isAnchored: anchored !== undefined,
    anchoredAmount: anchored?.anchoredAmount ?? null,
    priceIncreased,
    anchoredAt: anchored?.anchoredAt.toISOString() ?? null,
  };
}

export default async function SubscriptionsPage() {
  const db = await getDb();

  const [transactions, bills, dismissed, anchored] = await Promise.all([
    listTransactionsForDetection(db),
    listBills(db),
    listDismissedSubscriptions(db),
    listAnchoredSubscriptions(db),
  ]);

  const detected = detectSubscriptions(transactions, bills);
  const dismissedIds = new Set(dismissed.map((d) => d._id));
  const anchoredMap = new Map(anchored.map((a) => [a._id, a]));

  const subscriptions: DetectedSubscriptionResponse[] = detected
    .filter((s) => !dismissedIds.has(s.id))
    .map((s) => serializeDetected(s, anchoredMap.get(s.id)));

  const pendingCount = subscriptions.filter((s) => !s.isAnchored).length;
  const trackedCount = subscriptions.filter((s) => s.isAnchored).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Subscriptions</h1>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
          {trackedCount > 0 ? `${trackedCount} tracked` : ''}
          {trackedCount > 0 && pendingCount > 0 ? ' · ' : ''}
          {pendingCount > 0 ? `${pendingCount} pending review` : ''}
          {trackedCount === 0 && pendingCount === 0 ? 'No recurring patterns detected' : ''}
        </p>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <SubscriptionsView initialSubscriptions={subscriptions} />
      </div>
    </div>
  );
}
