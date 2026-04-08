import { randomUUID } from 'crypto';
import type { StrictDB } from 'strictdb';
import type { SyncLog } from '@/lib/simplefin/types';

const COLLECTION = 'syncLog';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayLog(db: StrictDB): Promise<SyncLog> {
  const date = todayUTC();
  const existing = await db.queryOne<SyncLog>(COLLECTION, { date });
  if (existing) return existing;

  const fresh: SyncLog = {
    _id: randomUUID(),
    date,
    requestCount: 0,
    lastSyncAt: null,
    lastSyncType: null,
    historicalImportDone: false,
  };
  await db.insertOne<SyncLog>(COLLECTION, fresh);
  return fresh;
}

export async function incrementQuota(
  db: StrictDB,
  by: number,
  meta: { lastSyncType: SyncLog['lastSyncType'] },
): Promise<void> {
  const date = todayUTC();
  await db.updateOne<SyncLog>(
    COLLECTION,
    { date },
    { $set: { lastSyncAt: new Date(), lastSyncType: meta.lastSyncType }, $inc: { requestCount: by } },
  );
}

export async function getLastSyncAt(db: StrictDB): Promise<Date | null> {
  const logs = await db.queryMany<SyncLog>(
    COLLECTION,
    { lastSyncAt: { $ne: null } },
    { sort: { lastSyncAt: -1 }, limit: 1 },
  );
  return logs[0]?.lastSyncAt ?? null;
}

export async function markHistoricalDone(db: StrictDB): Promise<void> {
  const date = todayUTC();
  await db.updateOne<SyncLog>(COLLECTION, { date }, { $set: { historicalImportDone: true } });
}
