/**
 * One-time backfill: retroactively detect auto-payments for prior months.
 *
 * Usage:
 *   npx tsx scripts/backfill-autopay.ts                  # dry run, 3 months
 *   npx tsx scripts/backfill-autopay.ts --months 6       # dry run, 6 months
 *   npx tsx scripts/backfill-autopay.ts --commit         # apply changes
 */

import 'dotenv/config';
import { getDb } from '../src/adapters/db.js';
import { listBills, updateBill } from '../src/adapters/bills.js';
import { createPayment } from '../src/adapters/payments.js';
import { findBestMatch } from '../src/handlers/autoPayDetect.js';
import type { Transaction } from '../src/lib/simplefin/types.js';
import type { Bill } from '../src/types/bill.js';

const LOOKBACK_DAYS = 5;

function parseArgs() {
  const args = process.argv.slice(2);
  let months = 3;
  let commit = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--months' && args[i + 1]) {
      months = parseInt(args[i + 1]!, 10);
      if (isNaN(months) || months < 1) {
        console.error('--months must be a positive integer');
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--commit') {
      commit = true;
    }
  }

  return { months, commit };
}

function formatYYYYMM(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

interface BackfillMatch {
  billName: string;
  month: string;
  chargedAmt: number;
  confidence: string;
}

async function main() {
  const { months, commit } = parseArgs();
  const mode = commit ? 'COMMIT' : 'DRY RUN';
  console.log(`[backfill-autopay] Mode: ${mode} | Lookback: ${months} months\n`);

  const db = await getDb();
  const bills = await listBills(db);
  const recurringBills = bills.filter((b) => b.isRecurring);

  if (!recurringBills.length) {
    console.log('No recurring bills found. Nothing to do.');
    process.exit(0);
  }

  const now = new Date();
  const matched: BackfillMatch[] = [];
  const unmatched: { billName: string; month: string }[] = [];

  for (let offset = 1; offset <= months; offset++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthKey = formatYYYYMM(year, month);

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 1);
    const lookbackStart = new Date(monthStart.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const txns = await db.queryMany<Transaction>(
      'transactions',
      { amount: { $lt: 0 }, pending: false, posted: { $gte: lookbackStart, $lt: monthEnd } } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      { limit: 10000 },
    );

    const txnsThisMonth = txns.filter((t) => t.posted >= monthStart);
    const candidates = recurringBills.filter((b) => b.paidMonth !== monthKey);

    for (const bill of candidates) {
      const dueDay = typeof bill.dueDate === 'number' ? bill.dueDate : null;
      const eligibleTxns = (dueDay !== null && dueDay <= 7) ? txns : txnsThisMonth;
      const result = findBestMatch(bill, eligibleTxns);

      if (!result) {
        unmatched.push({ billName: bill.name, month: monthKey });
        continue;
      }

      const chargedAmt = Math.abs(result.transaction.amount);
      matched.push({ billName: bill.name, month: monthKey, chargedAmt, confidence: result.confidence });

      if (commit) {
        await updateBill(db, bill._id, { isPaid: true });
        await createPayment(db, { billId: bill._id, billName: bill.name, amount: bill.amount });
        await db.updateOne<Bill>(
          'bills',
          { _id: bill._id } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          { $set: { paidMonth: monthKey, lastChargedAmount: chargedAmt } },
          false,
        );
      }
    }
  }

  console.log(`── Results ──`);
  console.log(`Matched: ${matched.length} bill-months`);
  if (matched.length) {
    for (const m of matched) {
      console.log(`  ✓ ${m.month} | ${m.billName} | $${m.chargedAmt.toFixed(2)} (${m.confidence})`);
    }
  }

  console.log(`\nUnmatched: ${unmatched.length} bill-months`);
  if (unmatched.length) {
    const unique = [...new Set(unmatched.map((u) => u.billName))].sort();
    for (const name of unique) {
      const months = unmatched.filter((u) => u.billName === name).map((u) => u.month).join(', ');
      console.log(`  ✗ ${name} (${months})`);
    }
  }

  if (!commit && matched.length) {
    console.log(`\nRun with --commit to apply these changes.`);
  }

  process.exit(0);
}

main();
