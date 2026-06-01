import type { StrictDB } from 'strictdb';

const COLLECTION = 'pendingConfirmations';
const TTL_DAYS = 45;

export interface PendingConfirmation {
  _id: string;
  billId: string;
  billName: string;
  billAmount: number;
  transactionId: string;
  transactionDescription: string;
  transactionAmount: number;
  confidence: 'fuzzy';
  createdAt: Date;
}

export async function createPendingConfirmation(
  db: StrictDB,
  data: Omit<PendingConfirmation, '_id' | 'createdAt'>,
): Promise<void> {
  const existing = await db.queryMany<PendingConfirmation>(
    COLLECTION,
    { billId: data.billId } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    { limit: 1 },
  );
  if (existing.length > 0) return;

  const doc: PendingConfirmation = {
    _id: `pc_${data.billId}_${Date.now()}`,
    ...data,
    createdAt: new Date(),
  };
  await db.insertOne<PendingConfirmation>(COLLECTION, doc);
}

export async function listPendingConfirmations(db: StrictDB): Promise<PendingConfirmation[]> {
  return db.queryMany<PendingConfirmation>(COLLECTION, {}, { limit: 50 });
}

export async function deletePendingConfirmation(db: StrictDB, id: string): Promise<void> {
  await db.deleteOne(COLLECTION, { _id: id } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function pruneStaleConfirmations(db: StrictDB): Promise<number> {
  const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000);
  const stale = await db.queryMany<PendingConfirmation>(
    COLLECTION,
    { createdAt: { $lt: cutoff } } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    { limit: 200 },
  );
  await Promise.all(stale.map(doc => db.deleteOne(COLLECTION, { _id: doc._id } as any))); // eslint-disable-line @typescript-eslint/no-explicit-any
  return stale.length;
}
