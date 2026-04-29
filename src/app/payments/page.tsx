import type { Metadata } from 'next';
import type { BillResponse, Bill } from '@/types/bill';
import type { DetectedSubscription, DetectedSubscriptionResponse } from '@/types/subscription';
import { PaymentsShell } from '@/components/PaymentsShell';
import { getDb } from '@/adapters/db';
import { listBills } from '@/adapters/bills';
import { listTransactionsForDetection } from '@/adapters/accounts';
import { listDismissedSubscriptions } from '@/adapters/subscriptions';
import { detectSubscriptions } from '@/lib/subscriptions/detect';

export const metadata: Metadata = { title: 'Payments — Folio' };

type Tab = 'bills' | 'subscriptions' | 'recurring';

function serializeBill(bill: Bill): BillResponse {
  return {
    _id: bill._id, name: bill.name, amount: bill.amount,
    dueDate: bill.dueDate instanceof Date ? bill.dueDate.toISOString() : bill.dueDate,
    category: bill.category, isPaid: bill.isPaid, isAutoPay: bill.isAutoPay,
    isRecurring: bill.isRecurring, recurrenceInterval: bill.recurrenceInterval,
    url: bill.url, notes: bill.notes,
    createdAt: bill.createdAt instanceof Date ? bill.createdAt.toISOString() : String(bill.createdAt),
    updatedAt: bill.updatedAt instanceof Date ? bill.updatedAt.toISOString() : String(bill.updatedAt),
  };
}

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

  const db = await getDb();

  const [rawBills, transactions, dismissed] = await Promise.all([
    listBills(db),
    listTransactionsForDetection(db),
    listDismissedSubscriptions(db),
  ]);

  const allBills      = rawBills.map(serializeBill);
  const recurringBills = rawBills.filter(b => b.isRecurring).map(serializeBill);
  const totalMonthly  = recurringBills.reduce((s, b) => s + b.amount, 0);
  const totalPaid     = recurringBills.filter(b => b.isPaid).reduce((s, b) => s + b.amount, 0);
  const autoPayCount  = recurringBills.filter(b => b.isAutoPay).length;

  const detected     = detectSubscriptions(transactions, rawBills);
  const dismissedIds = new Set(dismissed.map(d => d._id));
  const subscriptions: DetectedSubscriptionResponse[] = detected
    .filter(s => !dismissedIds.has(s.id))
    .map(serializeDetected);

  return (
    <PaymentsShell
      initialTab={tab}
      allBills={allBills}
      recurringBills={recurringBills}
      totalMonthly={totalMonthly}
      totalPaid={totalPaid}
      autoPayCount={autoPayCount}
      subscriptions={subscriptions}
    />
  );
}
