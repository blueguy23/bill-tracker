import type { Metadata } from 'next';
import type { DetectedSubscriptionResponse, DetectedSubscription } from '@/types/subscription';
import type { BillResponse, Bill } from '@/types/bill';
import { SubscriptionsView } from '@/components/SubscriptionsView';
import { getDb } from '@/adapters/db';
import { listTransactionsForDetection } from '@/adapters/accounts';
import { listBills, listSubscriptionBills, updateLastChargedAmount } from '@/adapters/bills';
import { listDismissedSubscriptions } from '@/adapters/subscriptions';
import { detectSubscriptions } from '@/lib/subscriptions/detect';

export const metadata: Metadata = { title: 'Subscriptions' };

function serializeDetected(d: DetectedSubscription): DetectedSubscriptionResponse {
  return {
    id: d.id, normalizedName: d.normalizedName, rawDescriptions: d.rawDescriptions,
    amount: d.amount, amountVariance: d.amountVariance, interval: d.interval,
    lastCharged: d.lastCharged.toISOString(), nextEstimated: d.nextEstimated.toISOString(),
    occurrences: d.occurrences, accountIds: d.accountIds, confidence: d.confidence,
    suggestedCategory: d.suggestedCategory, matchedBillId: d.matchedBillId,
    recurringType: d.recurringType, typeConfidence: d.typeConfidence, signals: d.signals,
  };
}

function serializeBill(b: Bill): BillResponse {
  return {
    _id: b._id, name: b.name, amount: b.amount,
    dueDate: b.dueDate instanceof Date ? b.dueDate.toISOString() : b.dueDate,
    category: b.category, isPaid: b.isPaid, isAutoPay: b.isAutoPay,
    isRecurring: b.isRecurring, recurrenceInterval: b.recurrenceInterval,
    paidMonth: b.paidMonth, lastChargedAmount: b.lastChargedAmount,
    isSubscription: b.isSubscription, detectionId: b.detectionId,
    classificationMeta: b.classificationMeta
      ? { ...b.classificationMeta, classifiedAt: b.classificationMeta.classifiedAt.toISOString() }
      : undefined,
    createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString(),
  };
}

export default async function SubscriptionsPage() {
  const db = await getDb();

  const [transactions, allBills, dismissed, subBills] = await Promise.all([
    listTransactionsForDetection(db),
    listBills(db),
    listDismissedSubscriptions(db),
    listSubscriptionBills(db),
  ]);

  const detected      = detectSubscriptions(transactions, allBills);
  const dismissedIds  = new Set(dismissed.map((d) => d._id));
  const trackedIds    = new Set(subBills.map((b) => b.detectionId).filter(Boolean) as string[]);
  const trackedBillMap = new Map(subBills.filter((b) => b.detectionId).map((b) => [b.detectionId!, b]));

  // Update lastChargedAmount for tracked subs whose price drifted
  await Promise.all(
    detected
      .filter((d) => {
        const bill = trackedBillMap.get(d.id);
        return bill && Math.abs((bill.lastChargedAmount ?? bill.amount) - d.amount) > 0.5;
      })
      .map((d) => {
        const bill = trackedBillMap.get(d.id)!;
        return updateLastChargedAmount(db, bill._id, d.amount);
      }),
  );

  const pending = detected
    .filter((s) => !dismissedIds.has(s.id) && !trackedIds.has(s.id))
    .map(serializeDetected);

  const trackedBills = subBills.map(serializeBill);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Subscriptions</h1>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
          {trackedBills.length > 0 ? `${trackedBills.length} tracked` : ''}
          {trackedBills.length > 0 && pending.length > 0 ? ' · ' : ''}
          {pending.length > 0 ? `${pending.length} pending review` : ''}
          {trackedBills.length === 0 && pending.length === 0 ? 'No recurring patterns detected' : ''}
        </p>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <SubscriptionsView pendingSubscriptions={pending} trackedBills={trackedBills} />
      </div>
    </div>
  );
}
