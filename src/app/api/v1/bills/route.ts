import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleListBills, handleCreateBill } from '@/handlers/bills';
import { logger } from '@/lib/logger';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleListBills(db);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const db = await getDb();
    return handleCreateBill(db, req);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
