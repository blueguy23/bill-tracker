import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { listBills, listSubscriptionBills } from '@/adapters/bills';
import { listTransactionsForDetection } from '@/adapters/accounts';
import { listDismissedSubscriptions } from '@/adapters/subscriptions';
import { detectSubscriptions } from '@/lib/subscriptions/detect';

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET() {
  try {
    const db = await getDb();
    const month = currentYYYYMM();

    const [bills, subBills, transactions, dismissed] = await Promise.all([
      listBills(db),
      listSubscriptionBills(db),
      listTransactionsForDetection(db),
      listDismissedSubscriptions(db),
    ]);

    const unpaidBills = bills.filter(b => {
      if (!b.isRecurring) return !b.isPaid;
      return b.paidMonth !== month;
    }).length;

    const trackedIds = new Set(subBills.filter(b => b.detectionId).map(b => b.detectionId!));
    const dismissedIds = new Set(dismissed.map(d => d._id));
    const detected = detectSubscriptions(transactions, bills);
    const pendingSubs = detected.filter(d => !trackedIds.has(d.id) && !dismissedIds.has(d.id)).length;

    const priceChanges = subBills.filter(b =>
      b.lastChargedAmount !== undefined && Math.abs(b.lastChargedAmount - b.amount) > 0.5
    ).length;

    return NextResponse.json({ unpaidBills, pendingSubs, priceChanges });
  } catch {
    return NextResponse.json({ unpaidBills: 0, pendingSubs: 0, priceChanges: 0 });
  }
}
