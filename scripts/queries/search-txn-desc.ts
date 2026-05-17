import type { StrictDB } from 'strictdb';

export default {
  name: 'search-txn-desc',
  description: 'Search transaction descriptions by keyword (pass as extra arg)',
  async run(db: StrictDB, args?: string[]) {
    const keywords = ['anthropic', 'claude', 'visible', 'att', 'schoolsfirst', 'service fee', 'edgar'];
    const searches = args?.length ? args : keywords;

    for (const term of searches) {
      const txns = await db.queryMany(
        'transactions',
        { description: { $regex: term, $options: 'i' }, amount: { $lt: 0 } } as any,
        { sort: { posted: -1 }, limit: 5 },
      ) as any[];

      if (txns.length) {
        console.log(`\n── '${term}' ──`);
        for (const t of txns) {
          const date = t.posted instanceof Date ? t.posted.toISOString().slice(0, 10) : String(t.posted).slice(0, 10);
          console.log(`  ${date} | $${Math.abs(t.amount).toFixed(2)} | ${t.description}`);
        }
      } else {
        console.log(`\n── '${term}' ── NO RESULTS`);
      }
    }
  },
};
