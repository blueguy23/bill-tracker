import { NextResponse } from 'next/server';
import type { StrictDB } from 'strictdb';
import { getBillById } from '@/adapters/bills';
import { listPaymentsForBill } from '@/adapters/payments';
import type { PaymentRecord, PaymentResponse } from '@/types/payment';

function serializePayment(p: PaymentRecord): PaymentResponse {
  return {
    _id: p._id,
    billId: p.billId,
    billName: p.billName,
    amount: p.amount,
    paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : String(p.paidAt),
  };
}

export async function handleListPayments(db: StrictDB, billId: string): Promise<NextResponse> {
  const bill = await getBillById(db, billId);
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  const payments = await listPaymentsForBill(db, billId);
  return NextResponse.json({ payments: payments.map(serializePayment) });
}
