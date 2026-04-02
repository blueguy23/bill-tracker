import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { SimpleFINClient } from '@/lib/simplefin/client';
import { runHistoricalImport } from '@/handlers/sync';

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
    const result = await runHistoricalImport(db, client);
    return NextResponse.json({ synced: true, ...result });
  } catch (err) {
    console.error('[POST /api/v1/sync/historical]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
