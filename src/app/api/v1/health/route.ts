import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';

export async function GET() {
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

  const healthy = dbStatus === 'ok';
  const body = {
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTimeMs: Date.now() - start,
    checks: {
      db: { status: dbStatus, ...(dbError ? { error: dbError } : {}) },
    },
  };

  return NextResponse.json(body, { status: healthy ? 200 : 503 });
}
