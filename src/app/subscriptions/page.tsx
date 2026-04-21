import type { Metadata } from 'next';
import type { DetectedSubscriptionResponse } from '@/types/subscription';
import type { DetectedSubscription } from '@/types/subscription';
import { SubscriptionsView } from '@/components/SubscriptionsView';
import { getDb } from '@/adapters/db';
import { listTransactionsForDetection } from '@/adapters/accounts';
import { listBills } from '@/adapters/bills';
import { listDismissedSubscriptions } from '@/adapters/subscriptions';
import { detectSubscriptions } from '@/lib/subscriptions/detect';

export const metadata: Metadata = { title: 'Subscriptions — Bill Tracker' };

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

export default async function SubscriptionsPage() {
  const db = await getDb();

  const [transactions, bills, dismissed] = await Promise.all([
    listTransactionsForDetection(db),
    listBills(db),
    listDismissedSubscriptions(db),
  ]);

  const detected = detectSubscriptions(transactions, bills);
  const dismissedIds = new Set(dismissed.map((d) => d._id));
  const subscriptions: DetectedSubscriptionResponse[] = detected
    .filter((s) => !dismissedIds.has(s.id))
    .map(serializeDetected);

  const count = subscriptions.length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Subscriptions</h1>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
          {count === 0 ? 'No recurring patterns detected' : `${count} recurring pattern${count !== 1 ? 's' : ''} detected`}
        </p>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <SubscriptionsView initialSubscriptions={subscriptions} />
      </div>
    </div>
  );
}
