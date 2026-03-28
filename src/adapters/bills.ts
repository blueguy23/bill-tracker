import { randomUUID } from 'crypto';
import type { StrictDB, StrictFilter } from 'strictdb';
import type { Bill, CreateBillDto, UpdateBillDto } from '@/types/bill';

const COLLECTION = 'bills';

function byId(id: string): StrictFilter<Bill> {
  return { _id: id };
}

export async function listBills(db: StrictDB): Promise<Bill[]> {
  return db.queryMany<Bill>(COLLECTION, {}, { sort: { dueDate: 1 }, limit: 500 });
}

export async function getBillById(db: StrictDB, id: string): Promise<Bill | null> {
  return db.queryOne<Bill>(COLLECTION, byId(id));
}

export async function createBill(db: StrictDB, data: CreateBillDto): Promise<Bill> {
  const now = new Date();
  const bill: Bill = {
    _id: randomUUID(),
    name: data.name,
    amount: data.amount,
    dueDate: data.isRecurring ? Number(data.dueDate) : new Date(data.dueDate as string),
    category: data.category,
    isPaid: data.isPaid ?? false,
    isAutoPay: data.isAutoPay ?? false,
    isRecurring: data.isRecurring,
    recurrenceInterval: data.recurrenceInterval,
    url: data.url,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  };

  await db.insertOne<Bill>(COLLECTION, bill);
  return bill;
}

export async function updateBill(db: StrictDB, id: string, data: UpdateBillDto): Promise<Bill | null> {
  const updates: Partial<Bill> & { updatedAt: Date } = { updatedAt: new Date() };

  if (data.name !== undefined) updates.name = data.name;
  if (data.amount !== undefined) updates.amount = data.amount;
  if (data.category !== undefined) updates.category = data.category;
  if (data.isPaid !== undefined) updates.isPaid = data.isPaid;
  if (data.isAutoPay !== undefined) updates.isAutoPay = data.isAutoPay;
  if (data.isRecurring !== undefined) updates.isRecurring = data.isRecurring;
  if (data.recurrenceInterval !== undefined) updates.recurrenceInterval = data.recurrenceInterval;
  if (data.url !== undefined) updates.url = data.url;
  if (data.notes !== undefined) updates.notes = data.notes;

  if (data.dueDate !== undefined) {
    // isRecurring in the patch takes precedence; fall back to what we'd set in this update
    const isRecurring = data.isRecurring ?? false;
    updates.dueDate = isRecurring ? Number(data.dueDate) : new Date(data.dueDate as string);
  }

  await db.updateOne<Bill>(COLLECTION, byId(id), { $set: updates });
  // Returns null if document never existed (or was concurrently deleted) — handler maps to 404
  return getBillById(db, id);
}

export async function deleteBill(db: StrictDB, id: string): Promise<boolean> {
  const receipt = await db.deleteOne<Bill>(COLLECTION, byId(id));
  return receipt.deletedCount > 0;
}
