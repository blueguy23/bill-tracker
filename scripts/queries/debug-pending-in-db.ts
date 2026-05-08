import type { StrictDB } from 'strictdb';

export default {
  name: 'debug-pending-in-db',
  description: 'Find the known SimpleFIN pending transaction IDs in the DB and show their stored state',
  async run(db: StrictDB) {
    // All pending transactions (by pending flag)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flagged = await (db as any).queryMany('transactions', { pending: true }, { sort: { posted: -1 }, limit: 50 });
    console.log(`\nTransactions with pending=true in DB: ${flagged.length}`);
    for (const t of flagged as Record<string, unknown>[]) {
      console.log(`  ${t._id} | ${t.description} | ${t.amount} | posted: ${t.posted}`);
    }

    // Look up the two known pending IDs directly
    const ids = [
      'TRN-500e79b3-ec2b-4059-b85d-9cc0db714580', // Sam's Club
      'TRN-02d3535a-9f03-4ba0-aed7-b00c7476fd53', // Chick-fil-A
    ];
    console.log('\nDirect lookup of known pending IDs:');
    for (const id of ids) {
      const row = await db.queryOne('transactions', { _id: id });
      if (!row) {
        console.log(`  ${id}: NOT IN DB`);
      } else {
        const t = row as Record<string, unknown>;
        console.log(`  ${id}:`);
        console.log(`    description: ${t.description}`);
        console.log(`    pending:     ${t.pending}`);
        console.log(`    posted:      ${t.posted}`);
        console.log(`    importedAt:  ${t.importedAt}`);
      }
    }
  },
};
