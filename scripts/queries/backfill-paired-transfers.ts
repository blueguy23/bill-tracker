import 'dotenv/config';
import type { StrictDB } from 'strictdb';
import type { Transaction } from '../../src/lib/simplefin/types.js';
import { detectPairedTransfers } from '../../src/lib/detectPairedTransfers.js';

export default {
  name: 'backfill-paired-transfers',
  description: 'Tag internal account-to-account transfers by pairing opposite amounts across owned accounts',
  async run(db: StrictDB) {
    // Look across all history — use a large lookback window
    const LOOKBACK_DAYS = 365;

    console.log(`  Scanning last ${LOOKBACK_DAYS} days for unpaired account-to-account transfers...`);

    const pairedIds = await detectPairedTransfers(db, LOOKBACK_DAYS);

    if (!pairedIds.length) {
      console.log('  No new paired transfers found.');
      return;
    }

    console.log(`  Found ${pairedIds.length} transaction(s) to tag as internal transfers.`);

    let updated = 0;
    for (const id of pairedIds) {
      await db.updateOne<Transaction>('transactions', { _id: id }, { $set: { isTransfer: true } });
      updated++;
    }

    console.log(`\n  ✅ Done`);
    console.log(`  Tagged as internal transfer: ${updated}`);
  },
};
