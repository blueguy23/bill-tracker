import { randomUUID } from 'crypto';
import type { StrictDB } from 'strictdb';
import type { NotificationLog } from '@/types/notification';

const COLLECTION = 'notificationLog';

export async function insertNotificationLog(
  db: StrictDB,
  entry: Omit<NotificationLog, '_id'>,
): Promise<NotificationLog> {
  const doc: NotificationLog = { _id: randomUUID(), ...entry };
  await db.insertOne<NotificationLog>(COLLECTION, doc);
  return doc;
}

export async function findRecentLog(
  db: StrictDB,
  key: string,
  windowMs: number,
): Promise<NotificationLog | null> {
  const cutoff = new Date(Date.now() - windowMs);
  const results = await db.queryMany<NotificationLog>(
    COLLECTION,
    { key, sentAt: { $gte: cutoff } },
    { sort: { sentAt: -1 }, limit: 1 },
  );
  return results[0] ?? null;
}

export async function listRecentLogs(
  db: StrictDB,
  limit = 50,
): Promise<NotificationLog[]> {
  return db.queryMany<NotificationLog>(
    COLLECTION,
    {},
    { sort: { sentAt: -1 }, limit },
  );
}
