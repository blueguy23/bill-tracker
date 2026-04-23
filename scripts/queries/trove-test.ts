import 'dotenv/config';
import type { StrictDB } from 'strictdb';

const TROVE_API_KEY = process.env.TROVE_API_KEY;
const TROVE_URL = 'https://trove.headline.com/api/v1/transactions/enrich';

export default {
  name: 'trove-test',
  description: 'Test Trove enrichment API against 10 real transactions — prints raw response',
  async run(db: StrictDB) {
    if (!TROVE_API_KEY) {
      console.error('  ❌ TROVE_API_KEY not set in .env');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txns = (await (db as any).queryMany(
      'transactions',
      {},
      { sort: { posted: -1 }, limit: 10 },
    )) as Array<{ _id: string; description: string; amount: number; posted: string }>;

    if (!txns.length) {
      console.log('  No transactions found.');
      return;
    }

    console.log(`  Testing ${txns.length} transactions against Trove...\n`);

    for (const txn of txns) {
      const date = new Date(txn.posted).toISOString().slice(0, 10);
      const body = {
        description: txn.description,
        amount: Math.abs(txn.amount),
        date,
        user_id: txn._id,
      };

      console.log(`  ► ${txn.description} ($${txn.amount})`);

      const res = await fetch(TROVE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': TROVE_API_KEY,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.log(`    ❌ HTTP ${res.status}: ${await res.text()}\n`);
        continue;
      }

      const data = await res.json();
      console.log('    Raw response:');
      console.log(JSON.stringify(data, null, 4).replace(/^/gm, '    '));
      console.log('');
    }
  },
};
