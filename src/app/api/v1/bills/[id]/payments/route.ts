import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleListPayments } from '@/handlers/payments';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing bill id' }, { status: 400 });
    const db = await getDb();
    return handleListPayments(db, id);
  } catch (err) {
    console.error('[GET /api/v1/bills/:id/payments]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
