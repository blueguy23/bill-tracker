import 'dotenv/config';
import type { StrictDB } from 'strictdb';
import type { Transaction, Account } from '../../src/lib/simplefin/types.js';
import type { UserProfile } from '../../src/types/userProfile.js';
import { buildTransferRe, classifyTransfer } from '../../src/lib/classifyTransfer.js';

export default {
  name: 'backfill-is-transfer',
  description: 'Stamp isTransfer on all existing transactions using ownerName from user profile',
  async run(db: StrictDB) {
    const profile = await db.queryOne<UserProfile>('userProfile', { _id: 'singleton' });
    const ownerName = profile?.ownerName?.trim() || null;

    const accounts = await db.queryMany<Account>('accounts', {}, { limit: 500 });
    const creditAccountIds = new Set(accounts.filter(a => a.accountType === 'credit').map(a => a._id));

    const re = buildTransferRe(ownerName);
    console.log(`  Owner name    : ${ownerName ?? '(not set — Zelle name detection disabled)'}`);
    console.log(`  Transfer regex: ${re}`);
    console.log(`  Credit accounts: ${creditAccountIds.size}`);

    const allTxns = await db.queryMany<Transaction>('transactions', {}, { limit: 100000 });
    console.log(`  Transactions to process: ${allTxns.length}\n`);

    let transfers = 0;
    let updated = 0;

    for (const txn of allTxns) {
      const flag = classifyTransfer(txn, creditAccountIds, re);
      if (flag) transfers++;

      // Never downgrade true → false: paired detection or other methods may have set it
      if (flag && !txn.isTransfer) {
        await db.updateOne<Transaction>('transactions', { _id: txn._id }, { $set: { isTransfer: true } });
        updated++;
      }
    }

    console.log(`  ✅ Done`);
    console.log(`  Total transactions : ${allTxns.length}`);
    console.log(`  Flagged as transfer: ${transfers}`);
    console.log(`  Documents updated  : ${updated}`);
  },
};
