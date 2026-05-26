/**
 * Standalone cron sync script — invoked by system cron.
 *
 * Usage:
 *   npx tsx scripts/cron-sync.ts             # daily sync (default)
 *   npx tsx scripts/cron-sync.ts --historical # historical import (first run)
 *
 * Crontab examples:
 *   0 3 * * *  cd /app && npx tsx scripts/cron-sync.ts >> /var/log/bill-sync.log 2>&1
 *   0 14 * * * cd /app && npx tsx scripts/cron-sync.ts >> /var/log/bill-sync.log 2>&1
 */

import 'dotenv/config';
import { getDb } from '../src/adapters/db.js';
import { upsertHeartbeat } from '../src/adapters/cronHeartbeats.js';
import { SimpleFINClient } from '../src/lib/simplefin/client.js';
import { runDailySync, runHistoricalImport, QuotaExceededError } from '../src/handlers/sync.js';
import { detectAutoPayments } from '../src/handlers/autoPayDetect.js';

const isHistorical = process.argv.includes('--historical');
const timestamp = new Date().toISOString();

async function main() {
  console.log(`[${timestamp}] cron-sync starting — mode: ${isHistorical ? 'historical' : 'daily'}`);

  if (!process.env.SIMPLEFIN_URL) {
    console.error(`[${timestamp}] ERROR: SIMPLEFIN_URL is not set. Exiting.`);
    process.exit(1);
  }

  const db = await getDb();
  const client = new SimpleFINClient({ url: process.env.SIMPLEFIN_URL });
  const startMs = Date.now();

  try {
    const result = isHistorical
      ? await runHistoricalImport(db, client)
      : await runDailySync(db, client, 'daily');

    if (result.skipped) {
      console.log(`[${timestamp}] Historical import already done — skipped.`);
    } else {
      console.log(`[${timestamp}] Sync complete — accounts: ${result.accountsUpdated}, txns: ${result.transactionsUpserted}, quota: ${result.quotaUsed}/24`);
      if (result.warnings.length > 0) {
        for (const w of result.warnings) {
          console.warn(`[${timestamp}] WARN: ${w}`);
        }
      }
    }

    try {
      await detectAutoPayments(db);
      console.log(`[${timestamp}] Auto-pay detection complete.`);
    } catch (detectErr) {
      console.error(`[${timestamp}] Auto-pay detection failed:`, detectErr);
    }

    await upsertHeartbeat(db, {
      script: 'sync',
      lastSuccessAt: new Date(),
      lastRunAt: new Date(),
      lastDurationMs: Date.now() - startMs,
      lastError: null,
      metadata: {
        accountsUpdated: result.accountsUpdated,
        transactionsUpserted: result.transactionsUpserted,
        quotaUsed: result.quotaUsed,
      },
    });

    process.exit(0);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      console.warn(`[${timestamp}] QUOTA: Daily quota nearly reached (${err.used}/24) — sync skipped.`);
      process.exit(0);
    }

    const errorMsg = err instanceof Error ? err.message : String(err);
    try {
      await upsertHeartbeat(db, {
        script: 'sync',
        lastFailureAt: new Date(),
        lastRunAt: new Date(),
        lastDurationMs: Date.now() - startMs,
        lastError: errorMsg,
      });
    } catch {
      console.error(`[${timestamp}] Failed to write heartbeat on error`);
    }

    console.error(`[${timestamp}] ERROR:`, err);
    process.exit(1);
  }
}

main();
