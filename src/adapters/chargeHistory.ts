import { randomUUID } from 'crypto';
import type { StrictDB } from 'strictdb';

const COLLECTION = 'chargeHistory';

export interface ChargeRecord {
  _id: string;
  billId: string;
  amount: number;
  detectedAt: Date;
}

export interface ChargeRecordResponse {
  _id: string;
  billId: string;
  amount: number;
  detectedAt: string;
}

export async function recordCharge(
  db: StrictDB,
  billId: string,
  amount: number,
): Promise<ChargeRecord> {
  const record: ChargeRecord = {
    _id: randomUUID(),
    billId,
    amount,
    detectedAt: new Date(),
  };
  await db.insertOne<ChargeRecord>(COLLECTION, record);
  return record;
}

export async function listChargesForBill(
  db: StrictDB,
  billId: string,
  limit = 12,
): Promise<ChargeRecord[]> {
  return db.queryMany<ChargeRecord>(
    COLLECTION,
    { billId },
    { sort: { detectedAt: -1 }, limit },
  );
}
