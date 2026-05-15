/**
 * Standalone cron script for daily notification digest.
 *
 * Usage:
 *   npx tsx scripts/cron-notification-digest.ts
 *
 * Compiles due bills and budget warnings into a single Discord
 * embed. The 20-hour cooldown in runDailyDigest prevents
 * duplicate sends if called more than once per day.
 */

import 'dotenv/config';
import { getDb } from '../src/adapters/db.js';
import { runDailyDigest } from '../src/handlers/notificationDigest.js';

const timestamp = new Date().toISOString();

async function main() {
  console.log(`[${timestamp}] cron-notification-digest starting`);

  const db = await getDb();

  try {
    const result = await runDailyDigest(db);

    if (!result.sent) {
      console.log(`[${timestamp}] Digest not sent — reason: ${result.reason}`);
    } else {
      console.log(`[${timestamp}] Digest sent — bills due soon: ${result.billsDueSoon}, overdue: ${result.overdueCount}, budget warnings: ${result.budgetWarnings}`);
    }
    process.exit(0);
  } catch (err) {
    console.error(`[${timestamp}] ERROR:`, err);
    process.exit(1);
  }
}

main();
