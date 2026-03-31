import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { SimpleFINClient } from '@/lib/simplefin/client';
import { runDailySync, QuotaExceededError } from '@/handlers/sync';

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
  try {
    const db = await getDb();
    const client = getClient();
    const result = await runDailySync(db, client, 'manual');
    return NextResponse.json({ synced: true, ...result });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: 'Daily quota nearly reached', used: err.used, limit: err.limit },
        { status: 429 },
      );
    }
    console.error('[POST /api/v1/sync]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
