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
import { SimpleFINClient } from '../src/lib/simplefin/client.js';
import { runDailySync, runHistoricalImport, QuotaExceededError } from '../src/handlers/sync.js';

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
    process.exit(0);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      console.warn(`[${timestamp}] QUOTA: Daily quota nearly reached (${err.used}/24) — sync skipped.`);
      process.exit(0); // not a failure
    }
    console.error(`[${timestamp}] ERROR:`, err);
    process.exit(1);
  }
}

main();
