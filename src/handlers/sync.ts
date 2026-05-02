import type { StrictDB } from 'strictdb';
import type { SimpleFINClient } from '@/lib/simplefin/client';
import type { SyncResult } from '@/lib/simplefin/types';
import { getTodayLog, incrementUrlUnits, markHistoricalDone } from '@/adapters/syncLog';
import { upsertAccount, upsertTransaction } from '@/adapters/accounts';

const QUOTA_GUARD = Number(process.env.SIMPLEFIN_QUOTA_GUARD ?? 20);
const DAILY_QUOTA = Number(process.env.SIMPLEFIN_DAILY_QUOTA ?? 24);
const QUOTA_WARN = 15;

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
  balancesOnly = false,
): Promise<{ accountsUpdated: number; transactionsUpserted: number; warnings: string[]; unitCost: number }> {
  const { accounts, transactions, errors } = await client.fetchAccounts({ startDate, balancesOnly, includeHoldings: !balancesOnly });
  const unitCost = balancesOnly ? 0.5 : 1.0;

  let accountsUpdated = 0;
  for (const account of accounts) {
    await upsertAccount(db, account);
    accountsUpdated++;
  }

  const creditAccountIds = new Set(accounts.filter(a => a.accountType === 'credit').map(a => a._id));

  let transactionsUpserted = 0;
  for (const txn of transactions) {
    const inserted = await upsertTransaction(db, txn, creditAccountIds);
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

  await incrementUrlUnits(db, client.urlHash, unitCost, { lastSyncType: syncType });

  return { accountsUpdated, transactionsUpserted, warnings, unitCost };
}

export async function runDailySync(
  db: StrictDB,
  client: SimpleFINClient,
  syncType: 'daily' | 'manual' = 'daily',
): Promise<SyncResult> {
  const log = await getTodayLog(db);
  const currentUnits = log.urlUnits?.[client.urlHash] ?? 0;

  if (currentUnits >= QUOTA_GUARD) {
    throw new QuotaExceededError(currentUnits, DAILY_QUOTA);
  }

  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { accountsUpdated, transactionsUpserted, warnings, unitCost } = await syncFetch(
    db, client, startDate, syncType,
  );

  const unitsAfter = currentUnits + unitCost;
  const quotaWarning = unitsAfter >= QUOTA_WARN;

  if (quotaWarning) {
    console.warn(`[SimpleFIN] Quota warning: ${unitsAfter}/${DAILY_QUOTA} units used today.`);
  }

  return {
    accountsUpdated,
    transactionsUpserted,
    quotaUsed: log.requestCount + 1,
    warnings,
    ...(quotaWarning ? { quotaWarning: true, unitsRemaining: DAILY_QUOTA - unitsAfter } : {}),
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

  const currentUnits = log.urlUnits?.[client.urlHash] ?? 0;

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
  const unitsAfter = currentUnits + CHUNKS;

  if (unitsAfter >= QUOTA_WARN) {
    console.warn(`[SimpleFIN] Quota warning: ${unitsAfter}/${DAILY_QUOTA} units used today.`);
  }

  return {
    accountsUpdated: totalAccounts,
    transactionsUpserted: totalTxns,
    quotaUsed: updatedLog.requestCount,
    warnings: allWarnings,
    ...(unitsAfter >= QUOTA_WARN ? { quotaWarning: true, unitsRemaining: DAILY_QUOTA - unitsAfter } : {}),
  };
}
