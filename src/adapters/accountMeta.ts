import type { StrictDB } from 'strictdb';
import type { AccountMeta } from '@/types/creditAdvisor';

const COLLECTION = 'accountMeta';
const DEFAULT_TARGET_UTIL = Number(process.env.CREDIT_TARGET_UTIL ?? 0.05);

export async function getAccountMeta(db: StrictDB, accountId: string): Promise<AccountMeta> {
  const existing = await db.queryOne<AccountMeta>(COLLECTION, { _id: accountId });
  if (existing) return existing;
  return { _id: accountId, statementClosingDay: null, targetUtilization: DEFAULT_TARGET_UTIL, manualCreditLimit: null };
}

export async function listAccountMeta(db: StrictDB, accountIds: string[]): Promise<AccountMeta[]> {
  if (accountIds.length === 0) return [];
  const existing = await db.queryMany<AccountMeta>(COLLECTION, { _id: { $in: accountIds } }, { limit: 100 });
  const metaMap = new Map(existing.map((m) => [m._id, m]));
  return accountIds.map((id) => metaMap.get(id) ?? { _id: id, statementClosingDay: null, targetUtilization: DEFAULT_TARGET_UTIL, manualCreditLimit: null });
}

export async function upsertAccountMeta(db: StrictDB, meta: AccountMeta): Promise<void> {
  await db.updateOne<AccountMeta>(COLLECTION, { _id: meta._id }, { $set: meta }, true);
}
