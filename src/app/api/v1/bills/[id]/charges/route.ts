import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { getBillById } from '@/adapters/bills';
import { listChargesForBill } from '@/adapters/chargeHistory';
import type { ChargeRecordResponse } from '@/adapters/chargeHistory';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing bill id' }, { status: 400 });
    const db = await getDb();
    const bill = await getBillById(db, id);
    if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    const charges = await listChargesForBill(db, id);
    const response: ChargeRecordResponse[] = charges.map(c => ({
      _id: c._id,
      billId: c.billId,
      amount: c.amount,
      detectedAt: c.detectedAt instanceof Date ? c.detectedAt.toISOString() : String(c.detectedAt),
    }));
    return NextResponse.json({ charges: response });
  } catch (err) {
    console.error('[GET /api/v1/bills/:id/charges]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
