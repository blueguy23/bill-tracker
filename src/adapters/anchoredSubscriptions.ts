import type { StrictDB } from 'strictdb';
import type { AnchoredSubscription } from '@/types/subscription';
import type { SubscriptionInterval } from '@/types/subscription';
import type { BillCategory } from '@/types/bill';

const COLLECTION = 'anchoredSubscriptions';

export async function anchorSubscription(
  db: StrictDB,
  id: string,
  name: string,
  amount: number,
  interval: SubscriptionInterval,
  category: BillCategory,
  rawDescriptions: string[],
): Promise<AnchoredSubscription> {
  const doc: AnchoredSubscription = {
    _id: id,
    name,
    anchoredAmount: amount,
    interval,
    category,
    rawDescriptions,
    anchoredAt: new Date(),
    lastSeenAmount: amount,
    priceChangedAt: null,
  };
  try {
    await db.insertOne<AnchoredSubscription>(COLLECTION, doc);
  } catch {
    // Already anchored — idempotent
  }
  return doc;
}

export async function listAnchoredSubscriptions(
  db: StrictDB,
): Promise<AnchoredSubscription[]> {
  return db.queryMany<AnchoredSubscription>(COLLECTION, {}, { sort: { anchoredAt: -1 }, limit: 500 });
}

export async function updateAnchoredAmount(
  db: StrictDB,
  id: string,
  newAmount: number,
): Promise<void> {
  await db.updateOne<AnchoredSubscription>(
    COLLECTION,
    { _id: id },
    { $set: { lastSeenAmount: newAmount, priceChangedAt: new Date() } },
  );
}

export async function removeAnchoredSubscription(
  db: StrictDB,
  id: string,
): Promise<boolean> {
  const result = await db.deleteOne<AnchoredSubscription>(COLLECTION, { _id: id });
  return result.deletedCount > 0;
}
