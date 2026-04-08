import type { StrictDB } from 'strictdb';

export default {
  name: 'recent-txns',
  description: 'Show the 15 most recent transactions in the DB',
  async run(db: StrictDB) {
    const txns = await db.queryMany(
      'transactions',
      {},
      { sort: { posted: -1 }, limit: 15 }
    );
    if (!txns.length) {
      console.log('No transactions found.');
      return;
    }
    for (const t of txns as any[]) {
      const date = t.posted ? new Date(t.posted).toISOString().slice(0, 10) : 'NO DATE';
      console.log(`  ${date} | ${String(t.description).padEnd(45)} | $${t.amount}`);
    }
  },
};
