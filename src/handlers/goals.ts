import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { StrictDB } from 'strictdb';
import { listGoals, createGoal, updateGoal, deleteGoal } from '@/adapters/goals';
import { listAccounts } from '@/adapters/accounts';
import type { CreateGoalDto, UpdateGoalDto, GoalResponse, Goal } from '@/types/goal';

function serialize(g: Goal): GoalResponse {
  return {
    _id: g._id,
    name: g.name,
    targetAmount: g.targetAmount,
    savedAmount: g.savedAmount,
    monthlyContribution: g.monthlyContribution,
    targetDate: g.targetDate,
    linkedAccountId: g.linkedAccountId,
    createdAt: g.createdAt instanceof Date ? g.createdAt.toISOString() : String(g.createdAt),
    updatedAt: g.updatedAt instanceof Date ? g.updatedAt.toISOString() : String(g.updatedAt),
  };
}

export async function handleListGoals(db: StrictDB): Promise<NextResponse> {
  const goals = await listGoals(db);
  return NextResponse.json({ goals: goals.map(serialize) });
}

export async function handleCreateGoal(db: StrictDB, req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const dto = body as Record<string, unknown>;

  if (!dto.name || typeof dto.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (typeof dto.targetAmount !== 'number' || dto.targetAmount <= 0) {
    return NextResponse.json({ error: 'targetAmount must be a positive number' }, { status: 400 });
  }
  if (!dto.targetDate || typeof dto.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dto.targetDate)) {
    return NextResponse.json({ error: 'targetDate is required (YYYY-MM-DD)' }, { status: 400 });
  }

  if (dto.linkedAccountId != null) {
    if (typeof dto.linkedAccountId !== 'string') {
      return NextResponse.json({ error: 'linkedAccountId must be a string' }, { status: 400 });
    }
    const accounts = await listAccounts(db);
    if (!accounts.some(a => a._id === dto.linkedAccountId)) {
      return NextResponse.json({ error: 'linkedAccountId does not match any account' }, { status: 400 });
    }
  }

  const createDto: CreateGoalDto = {
    name: dto.name.trim(),
    targetAmount: dto.targetAmount,
    savedAmount: typeof dto.savedAmount === 'number' ? dto.savedAmount : 0,
    monthlyContribution: typeof dto.monthlyContribution === 'number' ? dto.monthlyContribution : 0,
    targetDate: dto.targetDate,
    linkedAccountId: (dto.linkedAccountId as string) ?? null,
  };

  const goal = await createGoal(db, createDto);
  return NextResponse.json({ goal: serialize(goal) }, { status: 201 });
}

export async function handleUpdateGoal(db: StrictDB, req: NextRequest, id: string): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const dto = body as Record<string, unknown>;
  const patch: UpdateGoalDto = {};

  if (dto.name !== undefined) {
    if (typeof dto.name !== 'string' || !dto.name.trim()) {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
    }
    patch.name = dto.name.trim();
  }
  if (dto.targetAmount !== undefined) {
    if (typeof dto.targetAmount !== 'number' || dto.targetAmount <= 0) {
      return NextResponse.json({ error: 'targetAmount must be a positive number' }, { status: 400 });
    }
    patch.targetAmount = dto.targetAmount;
  }
  if (dto.savedAmount !== undefined) {
    if (typeof dto.savedAmount !== 'number' || dto.savedAmount < 0) {
      return NextResponse.json({ error: 'savedAmount must be a non-negative number' }, { status: 400 });
    }
    patch.savedAmount = dto.savedAmount;
  }
  if (dto.monthlyContribution !== undefined) {
    if (typeof dto.monthlyContribution !== 'number' || dto.monthlyContribution < 0) {
      return NextResponse.json({ error: 'monthlyContribution must be a non-negative number' }, { status: 400 });
    }
    patch.monthlyContribution = dto.monthlyContribution;
  }
  if (dto.targetDate !== undefined) {
    if (typeof dto.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dto.targetDate)) {
      return NextResponse.json({ error: 'targetDate must be YYYY-MM-DD' }, { status: 400 });
    }
    patch.targetDate = dto.targetDate;
  }
  if (dto.linkedAccountId !== undefined) {
    if (dto.linkedAccountId !== null && typeof dto.linkedAccountId !== 'string') {
      return NextResponse.json({ error: 'linkedAccountId must be a string or null' }, { status: 400 });
    }
    if (typeof dto.linkedAccountId === 'string') {
      const accounts = await listAccounts(db);
      if (!accounts.some(a => a._id === dto.linkedAccountId)) {
        return NextResponse.json({ error: 'linkedAccountId does not match any account' }, { status: 400 });
      }
    }
    patch.linkedAccountId = dto.linkedAccountId as string | null;
  }

  const updated = await updateGoal(db, id, patch);
  if (!updated) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }
  return NextResponse.json({ goal: serialize(updated) });
}

export async function handleDeleteGoal(db: StrictDB, id: string): Promise<NextResponse> {
  const deleted = await deleteGoal(db, id);
  if (!deleted) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
