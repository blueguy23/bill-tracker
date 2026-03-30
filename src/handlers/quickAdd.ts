import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { StrictDB } from 'strictdb';
import { createQuickAdd, deleteQuickAdd } from '@/adapters/quickAdd';
import { BILL_CATEGORIES } from '@/types/bill';
import type { BillCategory } from '@/types/bill';
import type { CreateQuickAddDto } from '@/types/budget';

function isCategory(v: unknown): v is BillCategory {
  return typeof v === 'string' && (BILL_CATEGORIES as readonly string[]).includes(v);
}

// ── POST /api/v1/quick-adds ───────────────────────────────────────────────────

export async function handleCreateQuickAdd(
  db: StrictDB,
  req: NextRequest,
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const dto = body as Record<string, unknown>;

  if (!dto.description || typeof dto.description !== 'string' || dto.description.trim() === '') {
    return NextResponse.json({ error: 'description is required' }, { status: 400 });
  }

  if (typeof dto.amount !== 'number' || dto.amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  if (!isCategory(dto.category)) {
    return NextResponse.json(
      { error: `Invalid category. Valid values: ${BILL_CATEGORIES.join(', ')}` },
      { status: 400 },
    );
  }

  const createDto: CreateQuickAddDto = {
    description: dto.description.trim(),
    amount: dto.amount,
    category: dto.category,
  };

  const transaction = await createQuickAdd(db, createDto);
  return NextResponse.json({ transaction }, { status: 201 });
}

// ── DELETE /api/v1/quick-adds/[id] ────────────────────────────────────────────

export async function handleDeleteQuickAdd(
  db: StrictDB,
  id: string,
): Promise<NextResponse> {
  const deleted = await deleteQuickAdd(db, id);

  if (!deleted) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
