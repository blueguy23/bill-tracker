import type { StrictDB } from 'strictdb';
import type { Bill } from '../../src/types/bill.js';
import type { Transaction } from '../../src/lib/simplefin/types.js';
import { findBestMatch } from '../../src/handlers/autoPayDetect.js';

export default {
  name: 'backfill-last-charged',
  description: 'Backfill lastChargedAmount on bills missing it — uses most recent matching transaction or defaults to bill.amount',
  async run(db: StrictDB) {
    const bills = await db.queryMany<Bill>('bills', { isRecurring: true }, { limit: 500 });
    const needsBackfill = bills.filter(b => b.lastChargedAmount === undefined);
    const alreadySet = bills.length - needsBackfill.length;

    console.log(`  Total recurring bills: ${bills.length}`);
    console.log(`  Already have lastChargedAmount: ${alreadySet}`);
    console.log(`  Need backfill: ${needsBackfill.length}\n`);

    if (!needsBackfill.length) {
      console.log('  Nothing to backfill.');
      return;
    }

    const txns = await db.queryMany<Transaction>(
      'transactions',
      { amount: { $lt: 0 }, pending: false } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      { sort: { posted: -1 }, limit: 10000 },
    );

    let updated = 0;
    let defaulted = 0;

    for (const bill of needsBackfill) {
      const match = findBestMatch(bill, txns);
      const amount = match ? Math.abs(match.transaction.amount) : bill.amount;
      const source = match ? 'matched' : 'defaulted';

      await db.updateOne<Bill>(
        'bills',
        { _id: bill._id } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        { $set: { lastChargedAmount: amount } },
        false,
      );

      if (match) {
        updated++;
        console.log(`  SET ${bill.name.padEnd(35)} → $${amount.toFixed(2)} (${source}: "${match.transaction.description}")`);
      } else {
        defaulted++;
        console.log(`  SET ${bill.name.padEnd(35)} → $${amount.toFixed(2)} (${source}: no matching txn)`);
      }
    }

    console.log(`\n  Done: ${updated} matched, ${defaulted} defaulted, ${alreadySet} already set`);
  },
};
