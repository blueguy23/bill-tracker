import type { StrictDB } from 'strictdb';
import type { Transaction } from '@/lib/simplefin/types';

const TRANSACTIONS = 'transactions';

export async function setTransactionTags(
  db: StrictDB,
  transactionId: string,
  tags: string[],
): Promise<boolean> {
  const normalized = tags
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && t.length <= 50);

  const result = await db.updateOne<Transaction>(
    TRANSACTIONS,
    { _id: transactionId },
    { $set: { tags: normalized } },
  );
  return result !== null;
}

export async function setTransactionNotes(
  db: StrictDB,
  transactionId: string,
  notes: string,
): Promise<boolean> {
  const trimmed = notes.trim().slice(0, 500);
  const result = await db.updateOne<Transaction>(
    TRANSACTIONS,
    { _id: transactionId },
    { $set: { notes: trimmed || null } },
  );
  return result !== null;
}
