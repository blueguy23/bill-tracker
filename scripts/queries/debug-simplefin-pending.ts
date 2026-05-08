import type { StrictDB } from 'strictdb';

export default {
  name: 'debug-simplefin-pending',
  description: 'Call SimpleFIN directly with pending=1 and dump the raw response',
  async run(_db: StrictDB) {
    const url = process.env.SIMPLEFIN_URL;
    if (!url) {
      console.log('ERROR: SIMPLEFIN_URL not set in environment');
      return;
    }

    const parsed = new URL(`${url}/accounts`);
    const username = parsed.username;
    const password = parsed.password;
    parsed.username = '';
    parsed.password = '';
    parsed.searchParams.set('version', '2');
    parsed.searchParams.set('pending', '1');

    // Only fetch last 7 days so the response is small
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    parsed.searchParams.set('start-date', String(Math.floor(startDate.getTime() / 1000)));

    const headers: Record<string, string> = {};
    if (username || password) {
      headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }

    console.log('\nRequesting:', parsed.toString().replace(/:[^@]*@/, ':***@'));
    console.log('');

    const res = await fetch(parsed.toString(), { headers });
    if (!res.ok) {
      console.log(`HTTP ${res.status} error from SimpleFIN`);
      return;
    }

    const raw = await res.json() as {
      accounts: {
        id: string;
        name: string;
        transactions?: {
          id: string;
          posted: number;
          amount: string;
          description: string;
          pending?: boolean;
          extra?: Record<string, unknown> | null;
          [key: string]: unknown;
        }[];
      }[];
      errors?: unknown[];
      'x-api-message'?: string[];
    };

    if (raw['x-api-message']?.length) {
      console.log('Bridge messages:', raw['x-api-message'].join(' | '));
    }

    let totalTxns = 0;
    let pendingCount = 0;

    for (const acct of raw.accounts) {
      const txns = acct.transactions ?? [];
      totalTxns += txns.length;

      const pendingTxns = txns.filter(t =>
        t.pending === true ||
        (t.extra && t.extra.pending === true) ||
        // some bridges use a top-level pending field
        (t as unknown as Record<string, unknown>)['pending'] === true
      );
      pendingCount += pendingTxns.length;

      console.log(`Account: ${acct.name} (${acct.id})`);
      console.log(`  Total transactions returned: ${txns.length}`);
      console.log(`  Pending (any field): ${pendingTxns.length}`);

      if (txns.length > 0) {
        console.log('\n  All transaction fields (first txn as sample):');
        const sample = txns[0]!;
        for (const [k, v] of Object.entries(sample)) {
          console.log(`    ${k}: ${JSON.stringify(v)}`);
        }

        if (pendingTxns.length > 0) {
          console.log('\n  PENDING transactions:');
          for (const t of pendingTxns) {
            console.log(`    ${t.id} | ${t.description} | ${t.amount}`);
            console.log(`      top-level pending: ${t.pending}`);
            console.log(`      extra: ${JSON.stringify(t.extra)}`);
            // Print all keys to catch any non-standard fields
            const allKeys = Object.keys(t);
            console.log(`      all keys: ${allKeys.join(', ')}`);
          }
        }
      }
      console.log('');
    }

    console.log(`Summary: ${totalTxns} total transactions, ${pendingCount} pending`);

    if (pendingCount === 0) {
      console.log('\nDiagnosis: SimpleFIN returned 0 pending transactions.');
      console.log('Either your bank\'s bridge does not expose pending transactions,');
      console.log('or the pending transactions are not in the last 7 days window.');
    }
  },
};
