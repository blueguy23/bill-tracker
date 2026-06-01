import type { Metadata } from 'next';
import type { Bill } from '@/types/bill';
import { PriceWatchView, type PriceWatchItem } from '@/components/PriceWatchView';
import { getDb } from '@/adapters/db';
import { listBills } from '@/adapters/bills';
import type { Transaction } from '@/lib/simplefin/types';

export const metadata: Metadata = { title: 'Price Watch' };

async function buildPriceWatchItems(db: import('strictdb').StrictDB, recurringBills: Bill[]): Promise<PriceWatchItem[]> {
  if (recurringBills.length === 0) return [];

  const hintsToQuery = recurringBills
    .filter(b => b.paymentDescriptionHint)
    .map(b => b.paymentDescriptionHint!);

  const txByHint = new Map<string, Transaction[]>();
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

export default async function PriceWatchPage() {
  const db = await getDb();
  const rawBills = await listBills(db);
  const recurringBills = rawBills.filter(b => b.isRecurring);
  const priceWatchItems = await buildPriceWatchItems(db, recurringBills);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Price Watch</h1>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
          Tracking {recurringBills.length} recurring bill{recurringBills.length !== 1 ? 's' : ''} for price changes
        </p>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <PriceWatchView items={priceWatchItems} />
      </div>
    </div>
  );
}
