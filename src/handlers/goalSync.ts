import type { StrictDB } from 'strictdb';
import { listLinkedGoals, updateGoalSavedAmount } from '@/adapters/goals';
import { listAccounts } from '@/adapters/accounts';

export async function syncLinkedGoals(db: StrictDB): Promise<number> {
  const [linkedGoals, accounts] = await Promise.all([
    listLinkedGoals(db),
    listAccounts(db),
  ]);

  if (linkedGoals.length === 0) return 0;

  const balanceMap = new Map(accounts.map(a => [a._id, a.balance]));
  let updated = 0;

  for (const goal of linkedGoals) {
    const balance = balanceMap.get(goal.linkedAccountId!);
    if (balance === undefined) continue;
    const newSaved = Math.max(0, balance);
    if (Math.abs(newSaved - goal.savedAmount) < 0.01) continue;
    await updateGoalSavedAmount(db, goal._id, newSaved);
    updated++;
  }

  return updated;
}
