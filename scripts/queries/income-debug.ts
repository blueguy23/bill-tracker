import type { StrictDB } from 'strictdb';

export default {
  name: 'income-debug',
  description: 'Show all positive (income) transactions and account types',
  async run(db: StrictDB) {
    const accounts = await db.queryMany('accounts', {}, { limit: 50 }) as any[];
    console.log('Accounts:');
    for (const a of accounts) {
      const id = String(a._id ?? '').slice(-8);
      console.log(`  ${id} | ${String(a.orgName ?? '').padEnd(22)} | ${String(a.name ?? '').padEnd(22)} | type: ${a.accountType} | balance: ${a.balance}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txns = await (db as any).queryMany(
      'transactions',
      { amount: { $gt: 0 }, pending: false },
      { sort: { posted: -1 }, limit: 200 }
    ) as any[];

    console.log(`\nPositive transactions (${txns.length} total):\n`);
    for (const t of txns) {
      const posted = t.posted instanceof Date ? t.posted : new Date(Number(t.posted) * 1000);
      const date = posted.toISOString().slice(0, 10);
      const acctId = String(t.accountId ?? '').slice(-8);
      console.log(`${date} | acct:${acctId} | ${String(t.description).padEnd(45)} | $${t.amount}`);
    }
  },
};
