import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { getTodayLog } from '@/adapters/syncLog';

const QUOTA_LIMIT = Number(process.env.SIMPLEFIN_DAILY_QUOTA ?? 24);
const QUOTA_GUARD = Number(process.env.SIMPLEFIN_QUOTA_GUARD ?? 20);

function nextScheduledSync(cronExpr: string): string | null {
  // Minimal: parse "0 3 * * *" → next occurrence of hour:minute today or tomorrow
  try {
    const parts = cronExpr.split(' ');
    const minute = Number(parts[0]);
    const hour = Number(parts[1]);
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(hour, minute, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString();
  } catch {
    return null;
  }
}

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const log = await getTodayLog(db);
    return NextResponse.json({
      quotaUsed: log.requestCount,
      quotaLimit: QUOTA_LIMIT,
      quotaGuard: QUOTA_GUARD,
      lastSyncAt: log.lastSyncAt?.toISOString() ?? null,
      lastSyncType: log.lastSyncType,
      historicalImportDone: log.historicalImportDone,
      nextScheduledSync: nextScheduledSync(process.env.CRON_PRIMARY ?? '0 3 * * *'),
      simplefinConfigured: Boolean(process.env.SIMPLEFIN_URL),
    });
  } catch (err) {
    console.error('[GET /api/v1/sync/status]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
