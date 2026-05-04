import type { Metadata } from 'next';
import type { BillResponse, Bill } from '@/types/bill';
import type { DetectedSubscription, DetectedSubscriptionResponse } from '@/types/subscription';
import { PaymentsShell } from '@/components/PaymentsShell';
import { getDb } from '@/adapters/db';
import { listBills, listSubscriptionBills, updateLastChargedAmount } from '@/adapters/bills';
import { listTransactionsForDetection } from '@/adapters/accounts';
import { listDismissedSubscriptions } from '@/adapters/subscriptions';
import { detectSubscriptions } from '@/lib/subscriptions/detect';

export const metadata: Metadata = { title: 'Payments' };

type Tab = 'bills' | 'subscriptions' | 'recurring';

function serializeBill(bill: Bill): BillResponse {
  return {
    _id: bill._id, name: bill.name, amount: bill.amount,
    dueDate: bill.dueDate instanceof Date ? bill.dueDate.toISOString() : bill.dueDate,
    category: bill.category, isPaid: bill.isPaid, isAutoPay: bill.isAutoPay,
    isRecurring: bill.isRecurring, recurrenceInterval: bill.recurrenceInterval,
    paidMonth: bill.paidMonth, lastChargedAmount: bill.lastChargedAmount,
    isSubscription: bill.isSubscription, detectionId: bill.detectionId,
    classificationMeta: bill.classificationMeta
      ? { ...bill.classificationMeta, classifiedAt: bill.classificationMeta.classifiedAt.toISOString() }
      : undefined,
    url: bill.url, notes: bill.notes,
    createdAt: bill.createdAt instanceof Date ? bill.createdAt.toISOString() : String(bill.createdAt),
    updatedAt: bill.updatedAt instanceof Date ? bill.updatedAt.toISOString() : String(bill.updatedAt),
  };
}

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

const VALID_TABS: Tab[] = ['bills', 'subscriptions', 'recurring'];
function resolveTab(raw: string | undefined): Tab {
  return VALID_TABS.includes(raw as Tab) ? (raw as Tab) : 'bills';
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = resolveTab(rawTab);
  const db  = await getDb();

  const [rawBills, transactions, dismissed, subBills] = await Promise.all([
    listBills(db),
    listTransactionsForDetection(db),
    listDismissedSubscriptions(db),
    listSubscriptionBills(db),
  ]);

  const trackedIds     = new Set(subBills.map((b) => b.detectionId).filter(Boolean) as string[]);
  const trackedBillMap = new Map(subBills.filter((b) => b.detectionId).map((b) => [b.detectionId!, b]));

  const detected     = detectSubscriptions(transactions, rawBills);
  const dismissedIds = new Set(dismissed.map((d) => d._id));

  // Update lastChargedAmount for tracked subs with price drift
  await Promise.all(
    detected
      .filter((d) => {
        const bill = trackedBillMap.get(d.id);
        return bill && Math.abs((bill.lastChargedAmount ?? bill.amount) - d.amount) > 0.5;
      })
      .map((d) => updateLastChargedAmount(db, trackedBillMap.get(d.id)!._id, d.amount)),
  );

  const pending = detected
    .filter((s) => !dismissedIds.has(s.id) && !trackedIds.has(s.id))
    .map(serializeDetected);

  // Bills tab shows only non-subscription bills to keep the list clean
  const regularBills   = rawBills.filter((b) => !b.isSubscription).map(serializeBill);
  const recurringBills = rawBills.filter((b) => b.isRecurring && !b.isSubscription).map(serializeBill);
  const trackedBills   = subBills.map(serializeBill);

  const totalMonthly = recurringBills.reduce((s, b) => s + b.amount, 0);
  const totalPaid    = recurringBills.filter((b) => b.isPaid).reduce((s, b) => s + b.amount, 0);
  const autoPayCount = recurringBills.filter((b) => b.isAutoPay).length;

  return (
    <PaymentsShell
      initialTab={tab}
      allBills={regularBills}
      recurringBills={recurringBills}
      totalMonthly={totalMonthly}
      totalPaid={totalPaid}
      autoPayCount={autoPayCount}
      pendingSubscriptions={pending}
      trackedBills={trackedBills}
    />
  );
}
