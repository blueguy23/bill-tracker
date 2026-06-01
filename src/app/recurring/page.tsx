import type { BillResponse, Bill } from '@/types/bill';
import { RecurringView } from '@/components/RecurringView';
import type { PriceWatchItem } from '@/components/PriceWatchView';
import { getDb } from '@/adapters/db';
import { listBills } from '@/adapters/bills';
import type { Transaction } from '@/lib/simplefin/types';

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
    url: bill.url, notes: bill.notes,
    paidMonth: bill.paidMonth,
    createdAt: bill.createdAt instanceof Date ? bill.createdAt.toISOString() : String(bill.createdAt),
    updatedAt: bill.updatedAt instanceof Date ? bill.updatedAt.toISOString() : String(bill.updatedAt),
  };
}

async function buildPriceWatchItems(db: import('strictdb').StrictDB, rawBills: Bill[]): Promise<PriceWatchItem[]> {
  const recurringBills = rawBills.filter(b => b.isRecurring);
  if (recurringBills.length === 0) return [];

  const hintsToQuery = recurringBills
    .filter(b => b.paymentDescriptionHint)
    .map(b => b.paymentDescriptionHint!);

  let txByHint = new Map<string, Transaction[]>();
  if (hintsToQuery.length > 0) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const transactions = await db.queryMany<Transaction>(
      'transactions',
      {
        description: { $regex: hintsToQuery.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), $options: 'i' },
        posted: { $gte: sixMonthsAgo },
      },
      { sort: { posted: 1 }, limit: 1000 },
    );

    for (const tx of transactions) {
      for (const hint of hintsToQuery) {
        if (tx.description.toLowerCase().includes(hint.toLowerCase())) {
          const existing = txByHint.get(hint) ?? [];
          existing.push(tx);
          txByHint.set(hint, existing);
          break;
        }
      }
    }
  }

  return recurringBills.map(bill => {
    const hint = bill.paymentDescriptionHint;
    const matchingTxs = hint ? (txByHint.get(hint) ?? []) : [];

    const chargeHistory = matchingTxs
      .filter(tx => Math.abs(Number(tx.amount)) > 0)
      .map(tx => {
        const posted = tx.posted instanceof Date
          ? tx.posted
          : typeof tx.posted === 'number'
            ? new Date(tx.posted * 1000)
            : new Date(String(tx.posted));
        return {
          amount: Math.abs(Number(tx.amount)),
          date: posted.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        };
      });

    return {
      billId: bill._id,
      name: bill.name,
      category: bill.category,
      currentAmount: bill.amount,
      lastCharged: bill.lastChargedAmount ?? bill.amount,
      isSubscription: bill.isSubscription ?? false,
      chargeHistory,
    };
  });
}

export default async function RecurringPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const db = await getDb();
  const rawBills = await listBills(db);
  const bills = rawBills.filter((b) => b.isRecurring).map(serializeBill);

  const totalMonthly = bills.reduce((s, b) => s + b.amount, 0);
  const totalPaid    = bills.filter(b => b.isPaid).reduce((s, b) => s + b.amount, 0);
  const autoPayCount = bills.filter(b => b.isAutoPay).length;

  const priceWatchItems = await buildPriceWatchItems(db, rawBills.filter(b => b.isRecurring));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <RecurringView
        bills={bills}
        totalMonthly={totalMonthly}
        totalPaid={totalPaid}
        autoPayCount={autoPayCount}
        priceWatchItems={priceWatchItems}
        defaultTab={tab === 'price-watch' ? 'price-watch' : 'bills'}
      />
    </div>
  );
}
