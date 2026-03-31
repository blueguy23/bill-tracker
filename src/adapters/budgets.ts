import type { StrictDB } from 'strictdb';
import type { BillCategory } from '@/types/bill';
import type { Budget, SetBudgetDto } from '@/types/budget';

const COLLECTION = 'budgets';

export async function getBudget(db: StrictDB, category: BillCategory): Promise<Budget | null> {
  return db.queryOne<Budget>(COLLECTION, { _id: category });
}

export async function listBudgets(db: StrictDB): Promise<Budget[]> {
  return db.queryMany<Budget>(COLLECTION, {}, { limit: 100 });
}

export async function upsertBudget(
  db: StrictDB,
  category: BillCategory,
  dto: SetBudgetDto,
): Promise<Budget> {
  const existing = await getBudget(db, category);
  const now = new Date();

  if (existing) {
    await db.updateOne<Budget>(
      COLLECTION,
      { _id: category },
      { $set: { monthlyAmount: dto.monthlyAmount, updatedAt: now } },
    );
  } else {
    await db.insertOne<Budget>(COLLECTION, {
      _id: category,
      category,
      monthlyAmount: dto.monthlyAmount,
      rolloverBalance: 0,
      updatedAt: now,
    });
  }

  return (await getBudget(db, category))!;
}

export async function updateRollover(
  db: StrictDB,
  category: BillCategory,
  newBalance: number,
): Promise<void> {
  await db.updateOne<Budget>(
    COLLECTION,
    { _id: category },
    { $set: { rolloverBalance: newBalance, updatedAt: new Date() } },
  );
}
