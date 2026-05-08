import type { StrictDB } from 'strictdb';

export default {
  name: 'fix-stuck-pending',
  description: 'Fix transactions stored with posted=1970 (stuck pending) — mark them pending:true so next sync can correct them',
  async run(db: StrictDB) {
    // Any transaction posted before Jan 2 1970 is a stuck pending (posted=0 from SimpleFIN)
    const epoch = new Date('1970-01-02T00:00:00.000Z');
    const stuck = await db.queryMany(
      'transactions',
      { posted: { $lt: epoch } },
      { sort: { posted: 1 }, limit: 100 },
    ) as Record<string, unknown>[];

    if (stuck.length === 0) {
      console.log('No stuck pending transactions found.');
      return;
    }

    console.log(`Found ${stuck.length} stuck transaction(s):`);
    for (const t of stuck) {
      console.log(`  ${t._id} | ${t.description} | ${t.amount} | pending was: ${t.pending}`);
      await db.updateOne(
        'transactions',
        { _id: t._id },
        { $set: { pending: true } as Record<string, unknown> },
        false,
      );
      console.log(`  → marked pending: true`);
    }

    console.log('\nDone. Run "Sync Now" to pull the correct data from SimpleFIN.');
  },
};
