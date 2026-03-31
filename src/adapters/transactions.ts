import type { StrictDB } from 'strictdb';
import type { SpendingTransaction } from '@/lib/budget/engine';

const COLLECTION = 'transactions';

/**
 * Returns all transactions posted within the given YYYY-MM month.
 * The `category` field is optional — transactions without a category
 * are excluded from budget spending calculations.
 */
export async function listTransactionsForMonth(
  db: StrictDB,
  month: string,           // YYYY-MM
): Promise<SpendingTransaction[]> {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y!, m! - 1, 1));
  const end = new Date(Date.UTC(y!, m!, 1));

  return db.queryMany<SpendingTransaction>(
    COLLECTION,
    { posted: { $gte: start, $lt: end } },
    { limit: 5000 },
  );
}
