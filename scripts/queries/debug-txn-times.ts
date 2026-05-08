import type { StrictDB } from 'strictdb';

export default {
  name: 'debug-txn-times',
  description: 'Show posted vs transactedAt for recent transactions to diagnose time display issues',
  async run(db: StrictDB) {
    const txns = await db.queryMany(
      'transactions',
      {},
      { sort: { importedAt: -1 }, limit: 20 },
    ) as Record<string, unknown>[];

    console.log('');
    console.log('description'.padEnd(40), 'posted (UTC)'.padEnd(30), 'transactedAt (UTC)'.padEnd(30), 'posted (local)'.padEnd(20), 'transactedAt (local)');
    console.log('-'.repeat(140));

    for (const t of txns) {
      const posted      = t.posted      ? new Date(t.posted as string) : null;
      const transacted  = t.transactedAt ? new Date(t.transactedAt as string) : null;
      const desc = String(t.description).slice(0, 38).padEnd(40);
      const postedUTC   = posted     ? posted.toISOString()                                                          : '(none)';
      const transUTC    = transacted ? transacted.toISOString()                                                      : '(none)';
      const postedLocal = posted     ? posted.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })    : '(none)';
      const transLocal  = transacted ? transacted.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '(none)';
      console.log(desc, postedUTC.padEnd(30), transUTC.padEnd(30), postedLocal.padEnd(20), transLocal);
    }
  },
};
