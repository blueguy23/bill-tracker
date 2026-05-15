/**
 * Standalone cron script for month-end budget rollover.
 *
 * Usage:
 *   npx tsx scripts/cron-budget-rollover.ts
 *
 * Rolls over unused budget from the previous month. Safe to call
 * multiple times — the idempotency guard (lastRolloverMonth)
 * prevents double-rollover.
 */

import 'dotenv/config';
import { getDb } from '../src/adapters/db.js';
import { applyMonthEndRollover } from '../src/lib/budget/rollover.js';

const timestamp = new Date().toISOString();

function previousMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

async function main() {
  const month = previousMonth();
  console.log(`[${timestamp}] cron-budget-rollover starting — month: ${month}`);

  const db = await getDb();

  try {
    await applyMonthEndRollover(db, month);
    console.log(`[${timestamp}] Rollover complete for ${month}.`);
    process.exit(0);
  } catch (err) {
    console.error(`[${timestamp}] ERROR:`, err);
    process.exit(1);
  }
}

main();
