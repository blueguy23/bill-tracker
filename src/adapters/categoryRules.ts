import type { StrictDB } from 'strictdb';
import type { Transaction } from '@/lib/simplefin/types';
import type { CategoryRule, TransactionCategory } from '@/lib/categorization/types';

const COLLECTION = 'categoryRules';

export async function listCategoryRules(db: StrictDB): Promise<CategoryRule[]> {
  return db.queryMany<CategoryRule>(COLLECTION, {}, { sort: { createdAt: 1 }, limit: 500 });
}

export async function upsertCategoryRule(
  db: StrictDB,
  rule: Omit<CategoryRule, '_id' | 'createdAt'>,
): Promise<void> {
  const existing = await db.queryOne<CategoryRule>(COLLECTION, { pattern: rule.pattern });
  if (existing) {
    await db.updateOne<CategoryRule>(COLLECTION, { _id: existing._id }, { $set: { category: rule.category } });
  } else {
    const doc: CategoryRule = {
      _id: `rule_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      ...rule,
      createdAt: new Date(),
    };
    await db.updateOne<CategoryRule>(COLLECTION, { _id: doc._id }, { $set: doc }, true);
  }
}

export async function deleteCategoryRule(db: StrictDB, id: string): Promise<boolean> {
  const existing = await db.queryOne<CategoryRule>(COLLECTION, { _id: id });
  if (!existing) return false;
  await db.deleteOne(COLLECTION, { _id: id });
  return true;
}

export async function setTransactionCategory(
  db: StrictDB,
  transactionId: string,
  category: TransactionCategory,
): Promise<boolean> {
  const result = await db.updateOne<Transaction>(
    'transactions',
    { _id: transactionId },
    { $set: { category, categorySource: 'user' } },
  );
  return result !== null;
}
