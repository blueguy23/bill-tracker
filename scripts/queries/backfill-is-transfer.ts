import 'dotenv/config';
import type { StrictDB } from 'strictdb';
import type { Transaction, Account } from '../../src/lib/simplefin/types.js';
import { classifyTransfer, buildTransferRe } from '../../src/lib/classifyTransfer.js';

export default {
  name: 'backfill-is-transfer',
  description: 'Stamp isTransfer on all existing transactions using current TRANSFER_OWNER_NAME config',
  async run(db: StrictDB) {
    const accounts = await db.queryMany<Account>('accounts', {}, { limit: 500 });
    const creditAccountIds = new Set(accounts.filter(a => a.accountType === 'credit').map(a => a._id));

    const re = buildTransferRe();
    console.log(`  Transfer regex: ${re}`);
    console.log(`  Credit accounts: ${creditAccountIds.size}`);

    const allTxns = await db.queryMany<Transaction>('transactions', {}, { limit: 100000 });
    console.log(`  Transactions to process: ${allTxns.length}\n`);

    let transfers = 0;
    let updated = 0;

    for (const txn of allTxns) {
      const flag = classifyTransfer(txn, creditAccountIds);
      if (flag) transfers++;

      // Only write when the stored value differs or is missing
      if (txn.isTransfer !== flag) {
        await db.updateOne<Transaction>('transactions', { _id: txn._id }, { $set: { isTransfer: flag } });
        updated++;
      }
    }

    console.log(`  ✅ Done`);
    console.log(`  Total transactions : ${allTxns.length}`);
    console.log(`  Flagged as transfer: ${transfers}`);
    console.log(`  Documents updated  : ${updated}`);
  },
};
