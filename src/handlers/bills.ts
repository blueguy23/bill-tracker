import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { StrictDB } from 'strictdb';
import { listBills, createBill, updateBill, deleteBill } from '@/adapters/bills';
import { BILL_CATEGORIES, RECURRENCE_INTERVALS } from '@/types/bill';
import type { Bill, BillCategory, BillResponse, CreateBillDto, RecurrenceInterval, UpdateBillDto } from '@/types/bill';

// ── Type guards ───────────────────────────────────────────────────────────────

function isCategory(v: unknown): v is BillCategory {
  return typeof v === 'string' && (BILL_CATEGORIES as readonly string[]).includes(v);
}

function isRecurrenceInterval(v: unknown): v is RecurrenceInterval {
  return typeof v === 'string' && (RECURRENCE_INTERVALS as readonly string[]).includes(v);
}

// ── Serialization ─────────────────────────────────────────────────────────────

function toISOString(value: unknown, field: string): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`Unexpected type for ${field}: ${typeof value}`);
}

function serializeBill(bill: Bill): BillResponse {
  return {
    _id: bill._id,
    name: bill.name,
    amount: bill.amount,
    dueDate: bill.dueDate instanceof Date ? bill.dueDate.toISOString() : bill.dueDate,
    category: bill.category,
    isPaid: bill.isPaid,
    isAutoPay: bill.isAutoPay,
    isRecurring: bill.isRecurring,
    recurrenceInterval: bill.recurrenceInterval,
    url: bill.url,
    notes: bill.notes,
    paymentDescriptionHint: bill.paymentDescriptionHint,
    createdAt: toISOString(bill.createdAt, 'createdAt'),
    updatedAt: toISOString(bill.updatedAt, 'updatedAt'),
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateCreateDto(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return 'Request body must be a JSON object';
  const b = body as Record<string, unknown>;

  if (typeof b.name !== 'string' || b.name.trim() === '') return 'name is required';
  if (b.name.trim().length > 200) return 'name must be 200 characters or fewer';
  if (typeof b.amount !== 'number' || b.amount < 0) return 'amount must be a non-negative number';
  if (b.amount > 1_000_000) return 'amount exceeds maximum allowed value';
  if (b.dueDate === undefined || b.dueDate === null) return 'dueDate is required';
  if (!isCategory(b.category)) return `category must be one of: ${BILL_CATEGORIES.join(', ')}`;
  if (typeof b.isRecurring !== 'boolean') return 'isRecurring must be a boolean';
  if (typeof b.notes === 'string' && b.notes.length > 2000) return 'notes must be 2000 characters or fewer';

  if (b.isRecurring) {
    if (!isRecurrenceInterval(b.recurrenceInterval)) {
      return `recurrenceInterval must be one of: ${RECURRENCE_INTERVALS.join(', ')} when isRecurring is true`;
    }
    const day = Number(b.dueDate);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return 'dueDate must be an integer between 1 and 31 for recurring bills';
    }
  } else {
    if (typeof b.dueDate !== 'string' || isNaN(Date.parse(b.dueDate))) {
      return 'dueDate must be a valid ISO date string for one-off bills';
    }
  }

  return null;
}

const IMMUTABLE_FIELDS = new Set(['_id', 'createdAt', 'updatedAt']);

function validateUpdateDto(body: Record<string, unknown>): string | null {
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') return 'name must be a non-empty string';
    if (body.name.trim().length > 200) return 'name must be 200 characters or fewer';
  }
  if (body.amount !== undefined) {
    if (typeof body.amount !== 'number' || body.amount < 0) return 'amount must be a non-negative number';
    if (body.amount > 1_000_000) return 'amount exceeds maximum allowed value';
  }
  if (body.category !== undefined && !isCategory(body.category)) {
    return `category must be one of: ${BILL_CATEGORIES.join(', ')}`;
  }
  if (body.isPaid !== undefined && typeof body.isPaid !== 'boolean') return 'isPaid must be a boolean';
  if (body.isAutoPay !== undefined && typeof body.isAutoPay !== 'boolean') return 'isAutoPay must be a boolean';
  if (body.isRecurring !== undefined && typeof body.isRecurring !== 'boolean') return 'isRecurring must be a boolean';
  if (body.recurrenceInterval !== undefined && !isRecurrenceInterval(body.recurrenceInterval)) {
    return `recurrenceInterval must be one of: ${RECURRENCE_INTERVALS.join(', ')}`;
  }
  if (typeof body.notes === 'string' && body.notes.length > 2000) return 'notes must be 2000 characters or fewer';
  if (body.paymentDescriptionHint !== undefined && body.paymentDescriptionHint !== null) {
    if (typeof body.paymentDescriptionHint !== 'string') return 'paymentDescriptionHint must be a string';
    if (body.paymentDescriptionHint.length > 500) return 'paymentDescriptionHint must be 500 characters or fewer';
  }
  return null;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function handleListBills(db: StrictDB): Promise<NextResponse> {
  const bills = await listBills(db);
  return NextResponse.json({ bills: bills.map(serializeBill) });
}

export async function handleCreateBill(db: StrictDB, req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validationError = validateCreateDto(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const bill = await createBill(db, body as CreateBillDto);
  return NextResponse.json({ bill: serializeBill(bill) }, { status: 201 });
}

export async function handleUpdateBill(db: StrictDB, req: NextRequest, id: string): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  // Strip fields the client is not allowed to modify
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (!IMMUTABLE_FIELDS.has(k)) cleaned[k] = v;
  }

  const validationError = validateUpdateDto(cleaned);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const bill = await updateBill(db, id, cleaned as UpdateBillDto);
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  return NextResponse.json({ bill: serializeBill(bill) });
}

export async function handleDeleteBill(db: StrictDB, id: string): Promise<NextResponse> {
  const deleted = await deleteBill(db, id);
  if (!deleted) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
