import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { listCategoryRules, upsertCategoryRule } from '@/adapters/categoryRules';
import { TRANSACTION_CATEGORIES } from '@/lib/categorization/types';
import type { TransactionCategory } from '@/lib/categorization/types';

export async function GET(): Promise<NextResponse> {
  const db = await getDb();
  const rules = await listCategoryRules(db);
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { pattern?: unknown; category?: unknown; isRegex?: unknown };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { pattern, category, isRegex } = body;

  if (!pattern || typeof pattern !== 'string' || pattern.trim() === '') {
    return NextResponse.json({ error: 'pattern is required' }, { status: 400 });
  }
  if (!category || !TRANSACTION_CATEGORIES.includes(category as TransactionCategory)) {
    return NextResponse.json(
      { error: `category must be one of: ${TRANSACTION_CATEGORIES.join(', ')}` },
      { status: 400 },
    );
  }

  // Validate regex if flagged as one
  if (isRegex) {
    try {
      new RegExp(pattern.trim());
    } catch {
      return NextResponse.json({ error: 'Invalid regex pattern' }, { status: 400 });
    }
  }

  const db = await getDb();
  await upsertCategoryRule(db, {
    pattern: pattern.trim(),
    category: category as TransactionCategory,
    isRegex: Boolean(isRegex),
  });

  return NextResponse.json({ ok: true });
}
