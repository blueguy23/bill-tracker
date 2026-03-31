import { randomUUID } from 'crypto';
import type { StrictDB } from 'strictdb';
import type { QuickAddTransaction, CreateQuickAddDto, DedupeMatch } from '@/types/budget';

const COLLECTION = 'quickAddTransactions';

export async function createQuickAdd(
  db: StrictDB,
  dto: CreateQuickAddDto,
): Promise<QuickAddTransaction> {
  const doc: QuickAddTransaction = {
    _id: randomUUID(),
    description: dto.description,
    amount: dto.amount,
    category: dto.category,
    addedAt: new Date(),
    matchedTransactionId: null,
  };
  await db.insertOne<QuickAddTransaction>(COLLECTION, doc);
  return doc;
}

export async function deleteQuickAdd(
  db: StrictDB,
  id: string,
): Promise<boolean> {
  const receipt = await db.deleteOne<QuickAddTransaction>(COLLECTION, { _id: id });
  return receipt.deletedCount > 0;
}

export async function listUnmatchedQuickAdds(db: StrictDB): Promise<QuickAddTransaction[]> {
  return db.queryMany<QuickAddTransaction>(
    COLLECTION,
    { matchedTransactionId: null },
    { limit: 500 },
  );
}

export async function applyDedupeMatches(
  db: StrictDB,
  matches: DedupeMatch[],
): Promise<void> {
  await Promise.all(
    matches.map((m) =>
      db.updateOne<QuickAddTransaction>(
        COLLECTION,
        { _id: m.quickAddId },
        { $set: { matchedTransactionId: m.transactionId } },
      ),
    ),
  );
}
