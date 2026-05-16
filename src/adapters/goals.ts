import type { StrictDB } from 'strictdb';
import type { Goal, CreateGoalDto, UpdateGoalDto } from '@/types/goal';

const COLLECTION = 'goals';

export async function listGoals(db: StrictDB): Promise<Goal[]> {
  return db.queryMany<Goal>(COLLECTION, {}, { sort: { createdAt: 1 }, limit: 100 });
}

export async function getGoal(db: StrictDB, id: string): Promise<Goal | null> {
  return db.queryOne<Goal>(COLLECTION, { _id: id });
}

export async function createGoal(db: StrictDB, dto: CreateGoalDto): Promise<Goal> {
  const now = new Date();
  const goal: Goal = {
    _id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: dto.name,
    targetAmount: dto.targetAmount,
    savedAmount: dto.savedAmount ?? 0,
    monthlyContribution: dto.monthlyContribution ?? 0,
    targetDate: dto.targetDate,
    linkedAccountId: dto.linkedAccountId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.updateOne<Goal>(COLLECTION, { _id: goal._id }, { $set: goal }, true);
  return goal;
}

export async function updateGoal(db: StrictDB, id: string, dto: UpdateGoalDto): Promise<Goal | null> {
  const existing = await getGoal(db, id);
  if (!existing) return null;

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (dto.name !== undefined) patch.name = dto.name;
  if (dto.targetAmount !== undefined) patch.targetAmount = dto.targetAmount;
  if (dto.savedAmount !== undefined) patch.savedAmount = dto.savedAmount;
  if (dto.monthlyContribution !== undefined) patch.monthlyContribution = dto.monthlyContribution;
  if (dto.targetDate !== undefined) patch.targetDate = dto.targetDate;
  if (dto.linkedAccountId !== undefined) patch.linkedAccountId = dto.linkedAccountId;

  await db.updateOne<Goal>(COLLECTION, { _id: id }, { $set: patch });
  return getGoal(db, id);
}

export async function deleteGoal(db: StrictDB, id: string): Promise<boolean> {
  const existing = await getGoal(db, id);
  if (!existing) return false;
  await db.deleteOne(COLLECTION, { _id: id });
  return true;
}

export async function listLinkedGoals(db: StrictDB): Promise<Goal[]> {
  return db.queryMany<Goal>(COLLECTION, { linkedAccountId: { $ne: null } }, { limit: 100 });
}

export async function updateGoalSavedAmount(db: StrictDB, id: string, savedAmount: number): Promise<void> {
  await db.updateOne<Goal>(COLLECTION, { _id: id }, { $set: { savedAmount, updatedAt: new Date() } });
}
