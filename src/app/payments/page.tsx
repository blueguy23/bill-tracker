import type { Metadata } from 'next';
import type { BillResponse, Bill } from '@/types/bill';
import { PaymentsShell } from '@/components/PaymentsShell';
import { getDb } from '@/adapters/db';
import { listBills, listSubscriptionBills, updateLastChargedAmount } from '@/adapters/bills';
import { listTransactionsForDetection } from '@/adapters/accounts';
import { detectSubscriptions } from '@/lib/subscriptions/detect';

export const metadata: Metadata = { title: 'Payments' };

type Tab = 'payments' | 'calendar';

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isPaidThisMonth(bill: Bill): boolean {
  if (!bill.isPaid) return false;
  if (!bill.isRecurring) return bill.isPaid;
  return bill.paidMonth === currentYYYYMM();
}

function serializeBill(bill: Bill): BillResponse {
  return {
    _id: bill._id, name: bill.name, amount: bill.amount,
    dueDate: bill.dueDate instanceof Date ? bill.dueDate.toISOString() : bill.dueDate,
    category: bill.category, isPaid: isPaidThisMonth(bill), isAutoPay: bill.isAutoPay,
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

const VALID_TABS: Tab[] = ['payments', 'calendar'];
function resolveTab(raw: string | undefined): Tab {
  return VALID_TABS.includes(raw as Tab) ? (raw as Tab) : 'payments';
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = resolveTab(rawTab);
  const db  = await getDb();

  const [rawBills, transactions, subBills] = await Promise.all([
    listBills(db),
    listTransactionsForDetection(db),
    listSubscriptionBills(db),
  ]);

  const trackedBillMap = new Map(subBills.filter((b) => b.detectionId).map((b) => [b.detectionId!, b]));
  const detected       = detectSubscriptions(transactions, rawBills);

  // Keep lastChargedAmount in sync for tracked subscriptions with price drift
  await Promise.all(
    detected
      .filter((d) => {
        const bill = trackedBillMap.get(d.id);
        return bill && Math.abs((bill.lastChargedAmount ?? bill.amount) - d.amount) > 0.5;
      })
      .map((d) => updateLastChargedAmount(db, trackedBillMap.get(d.id)!._id, d.amount)),
  );

  const regularBills = rawBills.filter((b) => !b.isSubscription).map(serializeBill);
  const trackedBills = subBills.map(serializeBill);

  const _now = new Date();
  const serverToday = { d: _now.getDate(), m: _now.getMonth(), y: _now.getFullYear() };

  return (
    <PaymentsShell
      initialTab={tab}
      allBills={regularBills}
      trackedBills={trackedBills}
      serverToday={serverToday}
    />
  );
}
