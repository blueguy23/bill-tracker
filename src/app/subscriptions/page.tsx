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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Detected Subscriptions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {count === 0
              ? 'No recurring subscriptions detected from your transactions'
              : `${count} recurring pattern${count !== 1 ? 's' : ''} detected from your transactions`}
          </p>
        </div>
      </div>
      <SubscriptionsView initialSubscriptions={subscriptions} />
    </div>
  );
}
