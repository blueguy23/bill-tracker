import type { StrictDB } from 'strictdb';

export default {
  name: 'txn-fields',
  description: 'Dump all raw fields on 5 recent transactions — check for MCC, merchant, category data',
  async run(db: StrictDB) {
    const txns = await db.queryMany(
      'transactions',
      {},
      { sort: { posted: -1 }, limit: 5 }
    );
    if (!txns.length) {
      console.log('No transactions found.');
      return;
    }
    for (const t of txns as Record<string, unknown>[]) {
      console.log('\n--- Transaction ---');
      for (const [key, val] of Object.entries(t)) {
        console.log(`  ${key.padEnd(25)} ${JSON.stringify(val)}`);
      }
    }
  },
};
