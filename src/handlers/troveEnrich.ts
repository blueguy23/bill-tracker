import type { StrictDB } from 'strictdb';
import { enrichTransaction } from '@/adapters/trove';
import { mapTroveToCategory } from '@/lib/categorization/troveMapping';
import { categorize } from '@/lib/categorization/engine';
import { listCategoryRules } from '@/adapters/categoryRules';
import type { Transaction } from '@/lib/simplefin/types';

const TRANSACTIONS = 'transactions';
const BATCH_SIZE = 10;

export interface EnrichResult {
  total: number;
  enrichedByTrove: number;
  enrichedByKeywords: number;
  skipped: number;
}

async function processBatch(
  db: StrictDB,
  batch: Transaction[],
  userRules: Awaited<ReturnType<typeof listCategoryRules>>,
): Promise<{ trove: number; keywords: number }> {
  const results = await Promise.all(
    batch.map(async (txn) => {
      const date = new Date(txn.posted as unknown as string).toISOString().slice(0, 10);
      const troveResult = await enrichTransaction(txn.description, txn.amount, date, txn._id);

      if (troveResult) {
        const category = mapTroveToCategory(troveResult, txn.description);
        if (category) {
          await db.updateOne<Transaction>(
            TRANSACTIONS,
            { _id: txn._id },
            { $set: { category, categorySource: 'trove', merchantName: troveResult.name, merchantDomain: troveResult.domain } },
            false,
          );
          return 'trove' as const;
        }
      }

      // Trove returned null or unmapped — fall back to keyword rules
      const category = categorize(txn.description, txn.memo ?? null, userRules);
      if (category !== txn.category) {
        await db.updateOne<Transaction>(
          TRANSACTIONS,
          { _id: txn._id },
          { $set: { category, categorySource: 'auto' } },
          false,
        );
      }
      return 'keywords' as const;
    }),
  );

  return {
    trove: results.filter((r) => r === 'trove').length,
    keywords: results.filter((r) => r === 'keywords').length,
  };
}

export async function enrichWithTrove(
  db: StrictDB,
  mode: 'recent' | 'all' = 'recent',
): Promise<EnrichResult> {
  if (!process.env.TROVE_API_KEY) {
    return { total: 0, enrichedByTrove: 0, enrichedByKeywords: 0, skipped: 0 };
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const query =
    mode === 'recent'
      ? { categorySource: { $ne: 'user' as const }, posted: { $gte: sevenDaysAgo } }
      : { categorySource: { $ne: 'user' as const } };

  // StrictDB's $ne operator requires a literal type — cast needed here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txns = await db.queryMany<Transaction>(TRANSACTIONS, query as any, { limit: 10000 });
  const userRules = await listCategoryRules(db);

  let enrichedByTrove = 0;
  let enrichedByKeywords = 0;

  for (let i = 0; i < txns.length; i += BATCH_SIZE) {
    const batch = txns.slice(i, i + BATCH_SIZE);
    const counts = await processBatch(db, batch, userRules);
    enrichedByTrove += counts.trove;
    enrichedByKeywords += counts.keywords;
  }

  return {
    total: txns.length,
    enrichedByTrove,
    enrichedByKeywords,
    skipped: txns.length - enrichedByTrove - enrichedByKeywords,
  };
}
