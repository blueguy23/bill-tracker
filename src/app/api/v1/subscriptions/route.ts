import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleListSubscriptions } from '@/handlers/subscriptions';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleListSubscriptions(db);
  } catch (err) {
    console.error('[GET /api/v1/subscriptions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
