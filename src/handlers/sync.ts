import type { StrictDB } from 'strictdb';
import type { SimpleFINClient } from '@/lib/simplefin/client';
import type { SyncResult } from '@/lib/simplefin/types';
import { getTodayLog, incrementQuota, markHistoricalDone } from '@/adapters/syncLog';
import { upsertAccount, upsertTransaction } from '@/adapters/accounts';

const QUOTA_GUARD = Number(process.env.SIMPLEFIN_QUOTA_GUARD ?? 20);
const DAILY_QUOTA = Number(process.env.SIMPLEFIN_DAILY_QUOTA ?? 24);

export class QuotaExceededError extends Error {
  constructor(public readonly used: number, public readonly limit: number) {
    super(`Daily quota nearly reached (${used}/${limit})`);
    this.name = 'QuotaExceededError';
  }
}

async function syncFetch(
  db: StrictDB,
  client: SimpleFINClient,
  startDate: Date,
  syncType: 'daily' | 'manual' | 'historical',
): Promise<{ accountsUpdated: number; transactionsUpserted: number; warnings: string[] }> {
  const { accounts, transactions, errors } = await client.fetchAccounts({ startDate });

  let accountsUpdated = 0;
  for (const account of accounts) {
    await upsertAccount(db, account);
    accountsUpdated++;
  }

  let transactionsUpserted = 0;
  for (const txn of transactions) {
    const inserted = await upsertTransaction(db, txn);
    if (inserted) transactionsUpserted++;
  }

  const warnings: string[] = [];
  for (const err of errors) {
    if (err.type === 'NO_DATA') {
      warnings.push(`Account ${err.accountId ?? 'unknown'} requires re-authentication (NO_DATA)`);
    } else if (err.type === 'UNAVAILABLE') {
      warnings.push(`Account ${err.accountId ?? 'unknown'} is temporarily unavailable`);
    }
  }

  await incrementQuota(db, 1, { lastSyncType: syncType });

  return { accountsUpdated, transactionsUpserted, warnings };
}

export async function runDailySync(
  db: StrictDB,
  client: SimpleFINClient,
  syncType: 'daily' | 'manual' = 'daily',
): Promise<SyncResult> {
  const log = await getTodayLog(db);

  if (log.requestCount >= QUOTA_GUARD) {
    throw new QuotaExceededError(log.requestCount, DAILY_QUOTA);
  }

  const startDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const { accountsUpdated, transactionsUpserted, warnings } = await syncFetch(db, client, startDate, syncType);

  return {
    accountsUpdated,
    transactionsUpserted,
    quotaUsed: log.requestCount + 1,
    warnings,
  };
}

export async function runHistoricalImport(
  db: StrictDB,
  client: SimpleFINClient,
): Promise<SyncResult> {
  const log = await getTodayLog(db);

  if (log.historicalImportDone) {
    return { accountsUpdated: 0, transactionsUpserted: 0, quotaUsed: log.requestCount, warnings: [], skipped: true };
  }

  const CHUNK_DAYS = 30;
  const CHUNKS = 3; // 90 days total
  const now = Date.now();

  let totalAccounts = 0;
  let totalTxns = 0;
  const allWarnings: string[] = [];

  // Fetch chunks sequentially (oldest first) — sequential to preserve quota
  for (let i = CHUNKS - 1; i >= 0; i--) {
    const startDate = new Date(now - (i + 1) * CHUNK_DAYS * 24 * 60 * 60 * 1000);
    const { accountsUpdated, transactionsUpserted, warnings } = await syncFetch(db, client, startDate, 'historical');
    totalAccounts = Math.max(totalAccounts, accountsUpdated);
    totalTxns += transactionsUpserted;
    allWarnings.push(...warnings);
  }

  await markHistoricalDone(db);
  const updatedLog = await getTodayLog(db);

  return {
    accountsUpdated: totalAccounts,
    transactionsUpserted: totalTxns,
    quotaUsed: updatedLog.requestCount,
    warnings: allWarnings,
  };
}
