import type { StrictDB } from 'strictdb';

export default {
  name: 'debug-simplefin-accounts',
  description: 'Dump raw SimpleFIN account fields — org, name, extra — to diagnose institution name issues',
  async run(_db: StrictDB) {
    const url = process.env.SIMPLEFIN_URL;
    if (!url) { console.log('ERROR: SIMPLEFIN_URL not set'); return; }

    const parsed = new URL(`${url}/accounts`);
    const username = parsed.username;
    const password = parsed.password;
    parsed.username = '';
    parsed.password = '';
    parsed.searchParams.set('version', '2');
    // Full request so we see all fields including org
    const startDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    parsed.searchParams.set('start-date', String(Math.floor(startDate.getTime() / 1000)));

    const headers: Record<string, string> = {};
    if (username || password) {
      headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }

    const res = await fetch(parsed.toString(), { headers });
    if (!res.ok) { console.log(`HTTP ${res.status}`); return; }

    const raw = await res.json() as { accounts: Record<string, unknown>[]; errors?: unknown[]; 'x-api-message'?: string[] };

    if (raw['x-api-message']?.length) console.log('Bridge messages:', raw['x-api-message'].join(' | '), '\n');

    console.log('');
    for (const a of raw.accounts) {
      console.log(`Account: ${a['name']} (${a['id']})`);
      // Print every field except transactions/holdings (too verbose)
      for (const [k, v] of Object.entries(a)) {
        if (k === 'transactions' || k === 'holdings') {
          console.log(`  ${k}: [${(v as unknown[])?.length ?? 0} items — omitted]`);
        } else {
          console.log(`  ${k}: ${JSON.stringify(v)}`);
        }
      }
      console.log('');
    }
  },
};
