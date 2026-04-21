import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { SimpleFINClient } from '@/lib/simplefin/client';
import { runDailySync, QuotaExceededError } from '@/handlers/sync';
import { notifySyncCompleted, notifySyncFailed, checkCreditAlerts } from '@/handlers/notifications';
import { enrichWithTrove } from '@/handlers/troveEnrich';

function getClient() {
  return new SimpleFINClient({ url: process.env.SIMPLEFIN_URL });
}

export async function POST(): Promise<Response> {
  if (!process.env.SIMPLEFIN_URL) {
    return NextResponse.json(
      { error: 'SimpleFIN not configured. Set SIMPLEFIN_URL in your environment.' },
      { status: 503 },
    );
  }
  const db = await getDb();
  try {
    const client = getClient();
    const result = await runDailySync(db, client, 'manual');
    void notifySyncCompleted(db, {
      accountsUpdated: result.accountsUpdated,
      transactionsImported: result.transactionsUpserted,
      warnings: result.warnings,
    });
    void checkCreditAlerts(db);
    void enrichWithTrove(db, 'recent');
    return NextResponse.json({ synced: true, ...result });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: 'Daily quota nearly reached', used: err.used, limit: err.limit },
        { status: 429 },
      );
    }
    void notifySyncFailed(db, { errorMessage: String(err) });
    console.error('[POST /api/v1/sync]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
