import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { listCategoryRules } from '@/adapters/categoryRules';
import { categorize } from '@/lib/categorization/engine';
import type { Transaction } from '@/lib/simplefin/types';

const TRANSACTIONS = 'transactions';

export async function POST(): Promise<Response> {
  try {
    const db = await getDb();
    const rules = await listCategoryRules(db);

    const all = await db.queryMany<Transaction>(TRANSACTIONS, { categorySource: { $ne: 'user' } }, { limit: 10000 });

    let updated = 0;
    for (const txn of all) {
      const category = categorize(txn.description, txn.memo ?? null, rules);
      if (category !== txn.category) {
        await db.updateOne<Transaction>(TRANSACTIONS, { _id: txn._id }, { $set: { category, categorySource: 'auto' } }, false);
        updated++;
      }
    }

    return NextResponse.json({ total: all.length, updated });
  } catch (err) {
    console.error('[POST /api/v1/transactions/recategorize]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
