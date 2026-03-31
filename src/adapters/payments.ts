import { randomUUID } from 'crypto';
import type { StrictDB } from 'strictdb';
import type { PaymentRecord, CreatePaymentDto } from '@/types/payment';

const COLLECTION = 'payments';

export async function createPayment(db: StrictDB, data: CreatePaymentDto): Promise<PaymentRecord> {
  const payment: PaymentRecord = {
    _id: randomUUID(),
    billId: data.billId,
    billName: data.billName,
    amount: data.amount,
    paidAt: new Date(),
  };
  await db.insertOne<PaymentRecord>(COLLECTION, payment);
  return payment;
}

export async function listPaymentsForBill(db: StrictDB, billId: string): Promise<PaymentRecord[]> {
  return db.queryMany<PaymentRecord>(
    COLLECTION,
    { billId },
    { sort: { paidAt: -1 }, limit: 500 },
  );
}
