import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleListBills, handleCreateBill } from '@/handlers/bills';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleListBills(db);
  } catch (err) {
    console.error('[GET /api/v1/bills]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const db = await getDb();
    return handleCreateBill(db, req);
  } catch (err) {
    console.error('[POST /api/v1/bills]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
