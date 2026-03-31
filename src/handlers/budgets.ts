import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { StrictDB } from 'strictdb';
import { listBudgets, getBudget, upsertBudget } from '@/adapters/budgets';
import { listUnmatchedQuickAdds } from '@/adapters/quickAdd';
import { listTransactionsForMonth } from '@/adapters/transactions';
import {
  computeSpending,
  computeEffectiveBudget,
  computeBurnRate,
  computeCategoryStatus,
} from '@/lib/budget/engine';
import { BILL_CATEGORIES } from '@/types/bill';
import type { BillCategory } from '@/types/bill';
import type { SetBudgetDto, CategoryBudgetSummary } from '@/types/budget';

function currentMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function isCategory(v: unknown): v is BillCategory {
  return typeof v === 'string' && (BILL_CATEGORIES as readonly string[]).includes(v);
}

// ── GET /api/v1/budgets ───────────────────────────────────────────────────────

export async function handleGetBudgets(db: StrictDB): Promise<NextResponse> {
  const month = currentMonth();

  const [budgetDocs, quickAdds, transactions] = await Promise.all([
    listBudgets(db),
    listUnmatchedQuickAdds(db),
    listTransactionsForMonth(db, month),
  ]);

  const budgetMap = new Map(budgetDocs.map((b) => [b.category, b]));
  const today = new Date();

  const budgets: CategoryBudgetSummary[] = BILL_CATEGORIES.map((category) => {
    const budget = budgetMap.get(category) ?? null;
    const spent = computeSpending(transactions, quickAdds, category, month);

    if (!budget) {
      return {
        category,
        monthlyAmount: null,
        rolloverBalance: 0,
        effectiveBudget: null,
        spent,
        remaining: null,
        status: null,
        burnRate: null,
      };
    }

    const effectiveBudget = computeEffectiveBudget(budget);
    const remaining = effectiveBudget - spent;
    const burnRate = computeBurnRate(transactions, quickAdds, category, month, {
      today,
      effectiveBudget,
    });
    const status = computeCategoryStatus(effectiveBudget, burnRate.linearProjectedTotal);

    return {
      category,
      monthlyAmount: budget.monthlyAmount,
      rolloverBalance: budget.rolloverBalance,
      effectiveBudget,
      spent,
      remaining,
      status,
      burnRate,
    };
  });

  return NextResponse.json({ month, budgets });
}

// ── PUT /api/v1/budgets/[category] ────────────────────────────────────────────

export async function handleSetBudget(
  db: StrictDB,
  category: string,
  req: NextRequest,
): Promise<NextResponse> {
  if (!isCategory(category)) {
    return NextResponse.json(
      { error: `Invalid category. Valid values: ${BILL_CATEGORIES.join(', ')}` },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const dto = body as Record<string, unknown>;

  if (dto.monthlyAmount === undefined || dto.monthlyAmount === null) {
    return NextResponse.json(
      { error: 'monthlyAmount is required' },
      { status: 400 },
    );
  }

  if (typeof dto.monthlyAmount !== 'number' || dto.monthlyAmount <= 0) {
    return NextResponse.json(
      { error: 'monthlyAmount must be a positive number' },
      { status: 400 },
    );
  }

  const setDto: SetBudgetDto = { monthlyAmount: dto.monthlyAmount };
  const budget = await upsertBudget(db, category, setDto);

  return NextResponse.json({ budget });
}
