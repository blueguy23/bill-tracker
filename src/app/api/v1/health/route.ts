import { NextResponse , NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _GET(_req: NextRequest) {
  const start = Date.now();

  // Verify DB connectivity — a failed ping means the app is not healthy.
  let dbStatus: 'ok' | 'error' = 'ok';
  let dbError: string | undefined;
  try {
    const db = await getDb();
    // StrictDB exposes the underlying MongoClient via .client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).client?.db().command({ ping: 1 });
  } catch (err) {
    dbStatus = 'error';
    dbError = err instanceof Error ? err.message : String(err);
  }

  const mem = process.memoryUsage();
  const healthy = dbStatus === 'ok';
  const body = {
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    responseTimeMs: Date.now() - start,
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    },
    checks: {
      db: { status: dbStatus, ...(dbError ? { error: dbError } : {}) },
    },
  };

  return NextResponse.json(body, { status: healthy ? 200 : 503 });
}

export const GET = withRequestLogging(_GET);
