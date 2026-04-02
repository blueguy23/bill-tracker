import type { StrictDB } from 'strictdb';
import type { DismissedSubscription } from '@/types/subscription';

const COLLECTION = 'dismissedSubscriptions';

export async function dismissSubscription(
  db: StrictDB,
  id: string,
): Promise<DismissedSubscription> {
  const doc: DismissedSubscription = { _id: id, dismissedAt: new Date() };
  try {
    await db.insertOne<DismissedSubscription>(COLLECTION, doc);
  } catch {
    // Swallow duplicate key errors — dismissing twice is idempotent
  }
  return doc;
}

export async function listDismissedSubscriptions(
  db: StrictDB,
): Promise<DismissedSubscription[]> {
  return db.queryMany<DismissedSubscription>(
    COLLECTION,
    {},
    { sort: { dismissedAt: -1 }, limit: 1000 },
  );
}

export async function undismissSubscription(
  db: StrictDB,
  id: string,
): Promise<boolean> {
  const result = await db.deleteOne<DismissedSubscription>(COLLECTION, { _id: id });
  return result.deletedCount > 0;
}
