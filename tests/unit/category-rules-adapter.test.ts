import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StrictDB } from 'strictdb';
import { listCategoryRules, upsertCategoryRule, deleteCategoryRule } from '@/adapters/categoryRules';
import type { CategoryRule } from '@/lib/categorization/types';

function makeDb(overrides: Partial<StrictDB> = {}): StrictDB {
  return {
    queryMany: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    updateOne: vi.fn().mockResolvedValue({}),
    deleteOne: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as StrictDB;
}

const mockRule: CategoryRule = {
  _id: 'rule_1',
  pattern: 'amazon',
  category: 'shopping',
  isRegex: false,
  createdAt: new Date('2026-01-01'),
};

describe('listCategoryRules', () => {
  it('returns rules from DB', async () => {
    const db = makeDb({ queryMany: vi.fn().mockResolvedValue([mockRule]) });
    const result = await listCategoryRules(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.pattern).toBe('amazon');
  });

  it('returns empty array when no rules exist', async () => {
    const db = makeDb();
    const result = await listCategoryRules(db);
    expect(result).toEqual([]);
  });
});

describe('upsertCategoryRule', () => {
  it('inserts new rule when pattern does not exist', async () => {
    const updateOne = vi.fn().mockResolvedValue({});
    const db = makeDb({ queryOne: vi.fn().mockResolvedValue(null), updateOne });

    await upsertCategoryRule(db, { pattern: 'netflix', category: 'subscriptions', isRegex: false });

    expect(updateOne).toHaveBeenCalledOnce();
    const [,, update, upsert] = updateOne.mock.calls[0]!;
    expect((update as { $set: CategoryRule }).$set.pattern).toBe('netflix');
    expect((update as { $set: CategoryRule }).$set.category).toBe('subscriptions');
    expect(upsert).toBe(true);
  });

  it('updates category when pattern already exists', async () => {
    const updateOne = vi.fn().mockResolvedValue({});
    const db = makeDb({ queryOne: vi.fn().mockResolvedValue(mockRule), updateOne });

    await upsertCategoryRule(db, { pattern: 'amazon', category: 'food', isRegex: false });

    expect(updateOne).toHaveBeenCalledOnce();
    const [, filter, update] = updateOne.mock.calls[0]!;
    expect((filter as { _id: string })._id).toBe('rule_1');
    expect((update as { $set: { category: string } }).$set.category).toBe('food');
  });
});

describe('deleteCategoryRule', () => {
  it('returns true and deletes when rule exists', async () => {
    const deleteOne = vi.fn().mockResolvedValue({});
    const db = makeDb({ queryOne: vi.fn().mockResolvedValue(mockRule), deleteOne });

    const result = await deleteCategoryRule(db, 'rule_1');

    expect(result).toBe(true);
    expect(deleteOne).toHaveBeenCalledOnce();
  });

  it('returns false when rule does not exist', async () => {
    const deleteOne = vi.fn();
    const db = makeDb({ queryOne: vi.fn().mockResolvedValue(null), deleteOne });

    const result = await deleteCategoryRule(db, 'nonexistent');

    expect(result).toBe(false);
    expect(deleteOne).not.toHaveBeenCalled();
  });
});
