import { randomUUID } from 'crypto';
import type { StrictDB } from 'strictdb';

const COLLECTION = 'cronHeartbeats';

export interface CronHeartbeat {
  _id: string;
  script: string;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  lastRunAt: Date;
  lastDurationMs: number;
  lastError: string | null;
  metadata: Record<string, unknown>;
}

type HeartbeatUpdate = Pick<CronHeartbeat, 'script' | 'lastRunAt' | 'lastDurationMs'> &
  Partial<Pick<CronHeartbeat, 'lastSuccessAt' | 'lastFailureAt' | 'lastError' | 'metadata'>>;

export async function upsertHeartbeat(
  db: StrictDB,
  update: HeartbeatUpdate,
): Promise<void> {
  const existing = await db.queryOne<CronHeartbeat>(COLLECTION, { script: update.script });
  if (existing) {
    await db.updateOne<CronHeartbeat>(COLLECTION, { _id: existing._id }, { $set: update });
  } else {
    const doc: CronHeartbeat = {
      _id: randomUUID(),
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      metadata: {},
      ...update,
    };
    await db.insertOne<CronHeartbeat>(COLLECTION, doc);
  }
}

export async function getHeartbeat(
  db: StrictDB,
  script: string,
): Promise<CronHeartbeat | null> {
  return db.queryOne<CronHeartbeat>(COLLECTION, { script });
}
