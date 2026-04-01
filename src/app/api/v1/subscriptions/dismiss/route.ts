import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleDismissSubscription } from '@/handlers/subscriptions';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const db = await getDb();
    return handleDismissSubscription(db, req);
  } catch (err) {
    console.error('[POST /api/v1/subscriptions/dismiss]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
